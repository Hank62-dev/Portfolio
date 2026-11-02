"""RAG Agent - retrieval and Chain-of-Thought reasoning."""

import re
from typing import Any

from src.agents.base import BaseAgent
from src.agents.hank_persona import HANK_PERSONA_CONTEXT
from src.agents.prompts import (
    ASSISTANT_FAST_ADDENDUM,
    ASSISTANT_REASONING_ADDENDUM,
    ASSISTANT_SYSTEM_PROMPT,
)
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
        """Answer from whatever fits: the user's documents, the web, or the model's own knowledge.

        Documents are offered to the model as context, and the model is told to ignore them when they do not
        bear on the question, so a general question is never forced through an unrelated file.
        """
        guard_result: GuardResult = input_data["guard_result"]
        plan: GuardResult = input_data["execution_plan"]
        history: list[dict] = input_data.get("conversation_history", [])
        memory_context: str = input_data.get("memory_context", "")
        mode: str = input_data.get("mode", "reasoning")
        use_web: bool = bool(input_data.get("use_web", False))

        chunks = [c for c in input_data.get("user_doc_chunks", []) if self._has_real_context([c])]

        # The company knowledge base is only consulted for questions that are about it
        if guard_result.is_in_domain:
            kb_chunks = await self._retrieve(query=guard_result.cleaned_prompt, mode=plan.retrieval_mode)
            if self._has_real_context(kb_chunks):
                chunks = chunks + kb_chunks

        self.logger.info(
            "Answering with %d context chunks, web=%s, route=%s", len(chunks), use_web, guard_result.route_to
        )
        return await self._generate_answer(guard_result, chunks, history, memory_context, mode, use_web)

    # ── The answer ────────────────────────────────────────────────

    async def _generate_answer(
        self,
        guard_result: GuardResult,
        chunks: list[dict],
        history: list[dict],
        memory_context: str,
        mode: str,
        use_web: bool,
        web_failed: bool = False,
    ) -> RAGResult:
        lang_instruction = self._get_language_instruction(guard_result.detected_language)

        parts: list[str] = []
        if memory_context:
            parts.append(memory_context)
        if chunks:
            parts.append(
                "## Documents (the user's own files and the knowledge base; "
                "use them only if they bear on the question)\n\n"
                f"{self._build_context(chunks)}"
            )
        else:
            parts.append("## Documents\n\n(None matched, or none were added.)")
        if web_failed:
            parts.append(
                "## Web search\n\nSearching the web failed just now. "
                "Say so in one short sentence, then answer from what you know."
            )
        elif use_web:
            parts.append(
                "## Web search\n\nYou can search the web. Do it when the question needs current or outside "
                "information, and attribute what you find to the web."
            )
        parts.append(
            f"## User request (type: {guard_result.task_type})\n\n{guard_result.cleaned_prompt}\n\n"
            f"## Language requirement\n{lang_instruction}"
        )

        addendum = ASSISTANT_FAST_ADDENDUM if mode == "fast" else ASSISTANT_REASONING_ADDENDUM
        messages = self._build_messages(
            system_prompt=f"{HANK_PERSONA_CONTEXT}\n\n{ASSISTANT_SYSTEM_PROMPT}\n{addendum}",
            user_message="\n\n".join(parts),
            history=history[-_MAX_HISTORY_TURNS:] if history else None,
        )

        try:
            response = await self._call_llm(messages, mode, web=use_web and not web_failed)
        except Exception as error:
            if use_web and not web_failed:
                # a search that fails must not cost the person their answer
                self.logger.warning("Web search failed (%s); answering without it", error)
                return await self._generate_answer(
                    guard_result, chunks, history, memory_context, mode, use_web, web_failed=True
                )
            raise

        content = response["content"]
        self._log_token_usage(response, mode, "answer")
        sources = response.get("sources", [])

        if sources:
            knowledge_source = "web"
        elif chunks and guard_result.route_to in ("rag", "hybrid"):
            knowledge_source = "rag"
        else:
            knowledge_source = "general_knowledge"

        return RAGResult(
            response_text=self._strip_thinking(content),
            reasoning_steps=self._extract_thinking(content) if mode != "fast" else [],
            retrieved_chunks=chunks if knowledge_source == "rag" else [],
            model_used=response.get("model", ""),
            token_usage=response.get("usage", {}),
            knowledge_source=knowledge_source,
            structured_output={},
            web_sources=sources,
        )

    # ── LLM dispatch ─────────────────────────────────────────────

    async def _call_llm(self, messages: list[dict], mode: str, web: bool = False) -> dict:
        """Unified LLM call: the fast model for 'fast', the strong one otherwise; with web search when asked."""
        if mode == "fast":
            return await self.llm.fast_chat(messages=messages, temperature=0.4, max_tokens=2048, web_search=web)
        return await self.llm.chat(messages=messages, temperature=0.2, max_tokens=4096, web_search=web)

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
