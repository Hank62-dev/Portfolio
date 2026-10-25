"""Verification Agent - anti-hallucination checker."""

from src.agents.base import BaseAgent
from src.agents.prompts import VERIFICATION_SYSTEM_PROMPT
from src.config import settings
from src.llm.gemini_client import parse_json_response
from src.schemas.internal import RAGResult

GENERAL_KNOWLEDGE_DISCLAIMER = (
    "[Luu y] Cau tra loi nay duoc tao tu kien thuc chung cua AI, "
    "khong phai tu tai lieu trong co so du lieu. "
    "Do do khong the xac minh do chinh xac."
)


class VerificationResult:
    def __init__(
        self,
        verified_response: str,
        confidence_score: float,
        groundedness_score: float,
        is_verified: bool,
        hallucination_flags: list[str],
        disclaimer: str | None = None,
        citations: list[dict] | None = None,
        knowledge_source: str = "rag",
    ):
        self.verified_response = verified_response
        self.confidence_score = confidence_score
        self.groundedness_score = groundedness_score
        self.is_verified = is_verified
        self.hallucination_flags = hallucination_flags
        self.disclaimer = disclaimer
        self.citations = citations or []
        self.knowledge_source = knowledge_source


class VerificationAgent(BaseAgent):
    name = "verification"

    async def execute(self, rag_result: RAGResult) -> VerificationResult:
        # General knowledge: skip verification, add disclaimer
        if rag_result.knowledge_source == "general_knowledge":
            return self._handle_general_knowledge(rag_result)

        # RAG path: full verification pipeline
        return await self._verify_rag_response(rag_result)

    def _handle_general_knowledge(self, rag_result: RAGResult) -> VerificationResult:
        response_with_note = (
            f"{rag_result.response_text}\n\n{GENERAL_KNOWLEDGE_DISCLAIMER}"
        )

        return VerificationResult(
            verified_response=response_with_note,
            confidence_score=0.6,
            groundedness_score=0.0,
            is_verified=False,
            hallucination_flags=["Response based on general LLM knowledge, not from knowledge base"],
            disclaimer=GENERAL_KNOWLEDGE_DISCLAIMER,
            citations=[],
            knowledge_source="general_knowledge",
        )

    async def _verify_rag_response(self, rag_result: RAGResult) -> VerificationResult:
        quality_chunks = self._filter_chunks(rag_result.retrieved_chunks)

        if not quality_chunks:
            return VerificationResult(
                verified_response=rag_result.response_text,
                confidence_score=0.5,
                groundedness_score=0.0,
                is_verified=False,
                hallucination_flags=["No source documents available for verification"],
                knowledge_source="rag",
            )

        source_texts = "\n\n---\n\n".join(
            f"[Source: {c.get('source', 'unknown')}]\n{c.get('text', '')}"
            for c in quality_chunks
        )

        messages = self._build_messages(
            system_prompt=VERIFICATION_SYSTEM_PROMPT,
            user_message=(
                f"## AI Response to Verify:\n{rag_result.response_text}\n\n"
                f"## Source Documents:\n{source_texts}"
            ),
        )

        response = await self.llm.chat(
            messages=messages,
            json_mode=True,
            temperature=0.1,
            max_tokens=8192,
        )

        parsed = parse_json_response(response["content"])

        if parsed.get("parse_error"):
            return VerificationResult(
                verified_response=rag_result.response_text,
                confidence_score=0.5,
                groundedness_score=0.5,
                is_verified=True,
                hallucination_flags=["Verification parsing failed"],
                knowledge_source="rag",
            )

        groundedness = parsed.get("overall_groundedness", 0.5)
        flags = parsed.get("hallucination_flags", [])
        recommendation = parsed.get("recommendation", "approved")
        disclaimer = parsed.get("disclaimer")

        is_verified = (
            groundedness >= settings.groundedness_threshold
            and recommendation != "refuse"
        )

        verified_response = rag_result.response_text
        if recommendation == "refuse":
            verified_response = (
                "Toi khong the cung cap cau tra loi dang tin cay cho cau hoi nay "
                "dua tren thong tin hien co trong co so du lieu. "
                "Vui long thu hoi voi cach dien dat khac hoac cung cap them ngu canh."
            )
        elif recommendation == "add_disclaimer" and disclaimer:
            verified_response = f"{rag_result.response_text}\n\n[!] {disclaimer}"

        citations = self._build_citations(quality_chunks, parsed.get("claims", []))

        return VerificationResult(
            verified_response=verified_response,
            confidence_score=groundedness,
            groundedness_score=groundedness,
            is_verified=is_verified,
            hallucination_flags=flags,
            disclaimer=disclaimer,
            citations=citations,
            knowledge_source="rag",
        )

    def _filter_chunks(self, chunks: list[dict], min_score: float = 0.3) -> list[dict]:
        return [c for c in chunks if c.get("score", 1.0) >= min_score]

    def _build_citations(
        self, chunks: list[dict], claims: list[dict]
    ) -> list[dict]:
        citations = []
        seen_sources = set()

        for chunk in chunks:
            source = chunk.get("source", "unknown")
            if source not in seen_sources:
                seen_sources.add(source)
                citations.append({
                    "source_id": source,
                    "source_name": chunk.get("source_name", source),
                    "chunk_text": chunk.get("text", "")[:300],
                    "relevance_score": chunk.get("score", 0.0),
                })

        return citations
