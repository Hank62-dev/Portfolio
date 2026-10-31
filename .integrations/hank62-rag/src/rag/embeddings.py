"""Gemini embeddings for LightRAG, the document store and the semantic cache.

Uses the Gemini API (no local model, no torch), so the service fits in a small container.
"""

import asyncio
import logging

import numpy as np
from google.genai import types

from src.config import settings
from src.llm.gemini_client import _get_client

logger = logging.getLogger(__name__)

_BATCH_SIZE = 100  # embed_content accepts at most 100 texts per request
_MAX_RETRIES = 5


async def _embed_batch(texts: list[str]) -> list[list[float]]:
    client = _get_client()
    config = types.EmbedContentConfig(output_dimensionality=settings.embedding_dimension)
    for attempt in range(_MAX_RETRIES):
        try:
            response = await client.aio.models.embed_content(
                model=settings.embedding_model,
                contents=texts,
                config=config,
            )
            return [embedding.values for embedding in response.embeddings]
        except Exception as e:
            if attempt == _MAX_RETRIES - 1:
                raise
            delay = 2 ** attempt
            logger.warning("Gemini embedding failed (%s), retrying in %ds", e, delay)
            await asyncio.sleep(delay)


async def embed_texts(texts: list[str]) -> np.ndarray:
    """Generate L2-normalized embeddings with Gemini.

    Compatible with LightRAG's EmbeddingFunc interface.

    Args:
        texts: List of text strings to embed.

    Returns:
        numpy array of shape (len(texts), embedding_dimension).
    """
    vectors: list[list[float]] = []
    for start in range(0, len(texts), _BATCH_SIZE):
        vectors.extend(await _embed_batch(texts[start:start + _BATCH_SIZE]))

    embeddings = np.array(vectors, dtype=np.float32)
    # Truncated outputs (< 3072 dims) are not unit length.
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    return embeddings / np.maximum(norms, 1e-12)


def get_embedding_dimension() -> int:
    """Embedding dimension (must match the Qdrant collections)."""
    return settings.embedding_dimension
