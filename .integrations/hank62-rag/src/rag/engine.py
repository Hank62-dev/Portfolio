"""LightRAG Engine - Groq + BGE-M3 integration."""

import logging
import os
from functools import partial
from typing import Any

from src.config import settings
from src.rag.embeddings import bge_m3_embed, get_embedding_dimension

logger = logging.getLogger(__name__)

# Groq API base URL (OpenAI-compatible)
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def _get_key_rotator():
    """Lazy-load key rotator to avoid circular imports at module level."""
    from src.llm.key_rotator import KeyRotator
    return KeyRotator(settings.groq_keys_list)


_rotator = None


def _get_rotator():
    global _rotator
    if _rotator is None:
        _rotator = _get_key_rotator()
    return _rotator


async def groq_llm_complete(
    prompt: str,
    system_prompt: str | None = None,
    history_messages: list[dict] | None = None,
    **kwargs: Any,
) -> str:
    """LLM function for LightRAG — Gemini primary, Groq fallback.

    Uses google-genai SDK for Gemini, falls back to Groq OpenAI-compatible API.
    """
    # strip json_schema (Groq incompatible, Gemini handles differently)
    kwargs.pop("keyword_extraction", None)
    kwargs.pop("response_format", None)
    kwargs.pop("model", None)

    # --- Primary: Gemini ---
    gemini_error = None
    if settings.gemini_api_key:
        try:
            from src.llm.gemini_client import gemini_chat
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if history_messages:
                messages.extend(history_messages)
            messages.append({"role": "user", "content": prompt})
            result = await gemini_chat(messages=messages)
            return result["content"]
        except Exception as e:
            gemini_error = e
            logger.warning("Gemini failed for LightRAG: %s", str(e)[:100])

    # --- Fallback: Groq (only if keys are configured) ---
    if settings.groq_keys_list:
        logger.info("Attempting Groq fallback for LightRAG...")
        from lightrag.llm.openai import openai_complete_if_cache

        rotator = _get_rotator()
        api_key = rotator.get_key()

        try:
            result = await openai_complete_if_cache(
                model=settings.main_model,
                prompt=prompt,
                system_prompt=system_prompt,
                history_messages=history_messages,
                base_url=GROQ_BASE_URL,
                api_key=api_key,
                keyword_extraction=False,
                **kwargs,
            )
            rotator.report_success(api_key)
            return result
        except Exception as e:
            rotator.report_error(api_key)
            raise

    # If no Groq fallback configured, re-raise original Gemini error
    if gemini_error:
        raise gemini_error
    raise RuntimeError("No LLM API keys configured (neither Gemini nor Groq)")


class RAGEngine:
    """Wrapper around LightRAG for document ingestion and querying.

    Integrates:
    - LightRAG for graph-based retrieval
    - BGE-M3 for local embeddings
    - Groq for LLM calls (via OpenAI-compatible API)
    """

    def __init__(self):
        self._rag = None
        self._initialized = False

    async def initialize(self):
        """Initialize LightRAG with all components."""
        if self._initialized:
            return

        try:
            from lightrag import LightRAG
            from lightrag.utils import EmbeddingFunc

            working_dir = settings.lightrag_working_dir
            os.makedirs(working_dir, exist_ok=True)

            # Define Qdrant URL for LightRAG
            qdrant_url = f"http://{settings.qdrant_host}:{settings.qdrant_port}"
            os.environ.setdefault("QDRANT_URL", qdrant_url)

            logger.info("Connecting LightRAG to Qdrant VectorDB at %s", qdrant_url)

            self._rag = LightRAG(
                working_dir=working_dir,
                llm_model_func=groq_llm_complete,
                llm_model_name=settings.main_model,
                embedding_func=EmbeddingFunc(
                    embedding_dim=get_embedding_dimension(),
                    max_token_size=8192,
                    func=bge_m3_embed,
                ),
                vector_storage="QdrantVectorDBStorage",
                vector_db_storage_cls_kwargs={"cosine_better_than_threshold": 0.2}
            )

            # v1.4.13 requires explicit storage init
            await self._rag.initialize_storages()

            self._initialized = True
            logger.info(
                "RAGEngine initialized (working_dir=%s, model=%s)",
                working_dir,
                settings.main_model,
            )

        except ImportError:
            logger.error("lightrag-hku not installed. Run: pip install lightrag-hku")
            raise
        except Exception as e:
            logger.error("Failed to initialize RAGEngine: %s", str(e))
            raise

    async def ingest(self, documents: list[str]) -> dict:
        """Ingest documents into the knowledge graph.

        Args:
            documents: List of document text strings.

        Returns:
            Dict with ingestion stats.
        """
        await self.initialize()

        ingested = 0
        errors = 0

        for i, doc in enumerate(documents):
            try:
                await self._rag.ainsert(doc)
                ingested += 1
                logger.info("Ingested document %d/%d", i + 1, len(documents))
            except Exception as e:
                errors += 1
                logger.error("Failed to ingest document %d: %s", i + 1, str(e))

        return {
            "total": len(documents),
            "ingested": ingested,
            "errors": errors,
        }

    async def query(self, question: str, mode: str = "hybrid") -> str:
        """Query the knowledge graph.

        Args:
            question: User's question.
            mode: Query mode - 'low_level', 'high_level', 'hybrid', 'mix'.

        Returns:
            Retrieved/generated answer string.
        """
        await self.initialize()

        try:
            from lightrag import QueryParam

            param = QueryParam(mode=mode)
            result = await self._rag.aquery(question, param=param)
            return result
        except Exception as e:
            logger.error("RAG query failed: %s", str(e))
            return f"Retrieval error: {str(e)}"

    async def aquery(self, question: str, param: dict | None = None) -> str:
        """LightRAG-compatible async query interface."""
        mode = (param or {}).get("mode", "hybrid")
        return await self.query(question, mode=mode)

    @property
    def is_initialized(self) -> bool:
        return self._initialized
