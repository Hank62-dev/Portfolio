"""RAG Agent - retrieval and Chain-of-Thought reasoning."""

import re
from typing import Any

from src.agents.base import BaseAgent
from src.agents.hank_persona import HANK_PERSONA_CONTEXT
from src.agents.prompts import FAST_RAG_SYSTEM_PROMPT, GENERAL_KNOWLEDGE_PROMPT, RAG_SYSTEM_PROMPT
from src.schemas.internal import GuardResult, RAGResult

# Minimum meaningful chunk text length
_MIN_CHUNK_LEN = 20

# Maximum history turns sent to LLM (older turns add noise, cost tokens)
_MAX_HISTORY_TURNS = 6

# Language code → explicit instruction
_LANG_INSTRUCTIONS: dict[str, str] = {
    "vi": "Respond entirely in Vietnamese (tiếng Việt). Do not use any other language.",
    "en": "Respond entirely in English. Do not use any other language.",
    "ja": "Respond entirely in Japanese (日本語). Do not use any other language.",
    "ko": "Respond entirely in Korean (한국어). Do not use any other language.",
    "zh": "Respond entirely in Chinese (中文). Do not use any other language.",
    "fr": "Respond entirely in French (français). Do not use any other language.",
    "de": "Respond entirely in German (Deutsch). Do not use any other language.",
    "es": "Respond entirely in Spanish (español). Do not use any other language.",
    "pt": "Respond entirely in Portuguese (português). Do not use any other language.",
    "ru": "Respond entirely in Russian (русский). Do not use any other language.",
    "th": "Respond entirely in Thai (ภาษาไทย). Do not use any other language.",
    "id": "Respond entirely in Indonesian (Bahasa Indonesia). Do not use any other language.",
}


class RAGAgent(BaseAgent):
    name = "rag"

    def __init__(self, llm_client, rag_engine=None):
        super().__init__(llm_client)
        self.rag_engine = rag_engine

    # ── Main entry ────────────────────────────────────────────────

    async def execute(self, input_data: dict[str, Any]) -> RAGResult:
        guard_result: GuardResult = input_data["guard_result"]
        plan: GuardResult = input_data["execution_plan"]
        history: list[dict] = input_data.get("conversation_history", [])
        memory_context: str = input_data.get("memory_context", "")
        mode: str = input_data.get("mode", "reasoning")
        user_doc_chunks: list[dict] = input_data.get("user_doc_chunks", [])

        # Priority 1: user-uploaded document chunks
        if user_doc_chunks and self._has_real_context(user_doc_chunks):
            self.logger.info(
                "Using %d user document chunks as context", len(user_doc_chunks)
            )
            return await self._generate_rag_response(
                guard_result, user_doc_chunks, history, memory_context, mode
            )

        # Priority 2: company knowledge base (LightRAG)
        if guard_result.is_in_domain:
            retrieved_chunks = await self._retrieve(
                query=guard_result.cleaned_prompt,
                mode=plan.retrieval_mode,
            )
            if self._has_real_context(retrieved_chunks):
                self.logger.info(
                    "Using %d knowledge-base chunks (mode=%s)",
                    len(retrieved_chunks), plan.retrieval_mode,
                )
                return await self._generate_rag_response(
                    guard_result, retrieved_chunks, history, memory_context, mode
                )

        # Priority 3: general-knowledge fallback
        self.logger.info(
            "No relevant domain context found — falling back to general knowledge"
        )
        return await self._generate_general_response(
            guard_result, history, memory_context, mode
        )

    # ── RAG response ──────────────────────────────────────────────

    async def _generate_rag_response(
        self,
        guard_result: GuardResult,
        chunks: list[dict],
        history: list[dict],
        memory_context: str = "",
        mode: str = "reasoning",
    ) -> RAGResult:
        context = self._build_context(chunks)
        lang_instruction = self._get_language_instruction(guard_result.detected_language)

        prompt_parts: list[str] = []
        if memory_context:
            prompt_parts.append(memory_context)
        prompt_parts.append(
            f"## Context (Retrieved from Knowledge Base)\n\n"
            f"{context}\n\n---\n\n"
            f"## User Request (type: {guard_result.task_type})\n\n"
            f"{guard_result.cleaned_prompt}\n\n"
            f"## Language requirement\n{lang_instruction}"
        )
        user_prompt = "\n\n".join(prompt_parts)

        system_prompt = f"{HANK_PERSONA_CONTEXT}\n\n{FAST_RAG_SYSTEM_PROMPT if mode == 'fast' else RAG_SYSTEM_PROMPT}"
        messages = self._build_messages(
            system_prompt=system_prompt,
            user_message=user_prompt,
            history=history[-_MAX_HISTORY_TURNS:] if history else None,
        )

        response = await self._call_llm(messages, mode)
        content = response["content"]
        self._log_token_usage(response, mode, "rag")

        return RAGResult(
            response_text=self._strip_thinking(content),
            reasoning_steps=self._extract_thinking(content) if mode != "fast" else [],
            retrieved_chunks=chunks,
            model_used=response.get("model", ""),
            token_usage=response.get("usage", {}),
            knowledge_source="rag",
            structured_output={},
        )

    # ── General knowledge response ────────────────────────────────

    async def _generate_general_response(
        self,
        guard_result: GuardResult,
        history: list[dict],
        memory_context: str = "",
        mode: str = "reasoning",
    ) -> RAGResult:
        lang_instruction = self._get_language_instruction(guard_result.detected_language)

        prompt_parts: list[str] = []
        if memory_context:
            prompt_parts.append(memory_context)
        prompt_parts.append(
            f"{guard_result.cleaned_prompt}\n\n"
            f"## Language requirement\n{lang_instruction}"
        )
        user_message = "\n\n".join(prompt_parts)

        messages = self._build_messages(
            system_prompt=f"{HANK_PERSONA_CONTEXT}\n\n{GENERAL_KNOWLEDGE_PROMPT}",
            user_message=user_message,
            history=history[-_MAX_HISTORY_TURNS:] if history else None,
        )

        response = await self._call_llm(messages, mode)
        content = response["content"]
        self._log_token_usage(response, mode, "general")

        return RAGResult(
            response_text=self._strip_thinking(content),
            reasoning_steps=self._extract_thinking(content) if mode != "fast" else [],
            retrieved_chunks=[],
            model_used=response.get("model", ""),
            token_usage=response.get("usage", {}),
            knowledge_source="general_knowledge",
            structured_output={},
        )

    # ── LLM dispatch ─────────────────────────────────────────────

    async def _call_llm(self, messages: list[dict], mode: str) -> dict:
        """Unified LLM call — fast model for 'fast', strong model otherwise."""
        if mode == "fast":
            return await self.llm.fast_chat(
                messages=messages,
                temperature=0.4,
                max_tokens=2048,
            )
        return await self.llm.chat(
            messages=messages,
            temperature=0.2,
            max_tokens=4096,
        )

    # ── Static helpers ────────────────────────────────────────────

    @staticmethod
    def _get_language_instruction(lang: str | None) -> str:
        code = (lang or "vi").lower().split("-")[0]  # handle "zh-cn" → "zh"
        return _LANG_INSTRUCTIONS.get(
            code,
            f"Respond in the same language as the user's question (detected: {code}).",
        )

    def _has_real_context(self, chunks: list[dict]) -> bool:
        if not chunks:
            return False
        for chunk in chunks:
            text = str(chunk.get("text", "")).strip()
            if text and text.lower() not in {"none", "n/a", ""} and len(text) > _MIN_CHUNK_LEN:
                return True
        return False

    async def _retrieve(self, query: str, mode: str) -> list[dict]:
        if self.rag_engine is None:
            return []
        try:
            result = await self.rag_engine.aquery(query, param={"mode": mode})
            if result is None:
                return []
            text = str(result).strip()
            if not text or text.lower() in {"none", "n/a"}:
                return []
            return [{"text": text, "source": "lightrag", "score": 1.0}]
        except Exception as e:
            self.logger.error("RAG retrieval failed: %s", str(e))
            return []

    def _build_context(self, chunks: list[dict]) -> str:
        """Format retrieved chunks into a readable context block."""
        parts: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source", f"doc_{i}")
            text = chunk.get("text", "").strip()
            score = chunk.get("score", 0.0)
            if not text:
                continue
            parts.append(f"[Source {i}: {source} | relevance: {score:.2f}]\n{text}")
        return "\n\n---\n\n".join(parts) if parts else "(No context available)"

    def _log_token_usage(self, response: dict, mode: str, source: str) -> None:
        usage = response.get("usage", {})
        if usage:
            self.logger.info(
                "Token usage: source=%s, mode=%s, model=%s, prompt=%s, completion=%s, total=%s",
                source,
                mode,
                response.get("model", "unknown"),
                usage.get("prompt", "?"),
                usage.get("completion", "?"),
                usage.get("total", "?"),
            )

    # ── Thinking block extraction ─────────────────────────────────

    def _extract_thinking(self, content: str) -> list[dict]:
        """Extract structured reasoning steps from <thinking>…</thinking> blocks."""
        match = re.search(r"<thinking>(.*?)</thinking>", content, re.DOTALL)
        if not match:
            return []

        thinking_text = match.group(1).strip()
        if not thinking_text:
            return []

        # Try to parse "Step N - ACTION: …" headers
        step_header = re.compile(r"Step\s*(\d+)\s*[-–]\s*(\w+)\s*:", re.IGNORECASE)
        matches = list(step_header.finditer(thinking_text))

        if matches:
            steps = []
            for i, m in enumerate(matches):
                step_num = int(m.group(1))
                action = m.group(2).strip().upper()
                start = m.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(thinking_text)
                raw = thinking_text[start:end].strip()
                thought = re.sub(r"^\[|\]$", "", raw).strip()
                if thought:
                    steps.append({
                        "step": step_num,
                        "thought": f"{action}: {thought}",
                        "action": action,
                        "result": "",
                    })
            if steps:
                return steps

        # Fallback: treat each non-empty, non-separator line as a step
        steps = []
        for i, line in enumerate(thinking_text.splitlines(), 1):
            line = line.strip()
            if not line or line.startswith("---"):
                continue
            cleaned = re.sub(r"^(Step\s*\d+\s*[-:.]?\s*)", "", line).strip()
            if cleaned:
                steps.append({"step": i, "thought": cleaned, "action": "", "result": ""})
        return steps

    def _strip_thinking(self, content: str) -> str:
        """Remove <thinking>…</thinking> blocks from the final response."""
        stripped = re.sub(r"<thinking>.*?</thinking>", "", content, flags=re.DOTALL)
        return stripped.strip()
