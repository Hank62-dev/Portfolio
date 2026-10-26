"""BGE-M3 Embedding Function for LightRAG.

Runs locally on CPU (MBP 16GB compatible).
Supports dense, sparse, and ColBERT retrieval.
"""

import logging

import numpy as np

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    """Lazy-load the embedding model (singleton)."""
    global _model
    if _model is None:
        logger.info("Loading BGE-M3 embedding model... (first load takes ~30s)")
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(
            "BAAI/bge-m3",
            device="cpu",
            trust_remote_code=True,
        )
        logger.info(
            "BGE-M3 loaded successfully. Dimension: %d",
            _model.get_sentence_embedding_dimension(),
        )
    return _model


def preload_model():
    """Eagerly load BGE-M3 at server startup to avoid cold start on first request."""
    _get_model()
    logger.info("BGE-M3 preloaded and ready for inference")


async def bge_m3_embed(texts: list[str]) -> np.ndarray:
    """Generate embeddings using BGE-M3.

    Compatible with LightRAG's EmbeddingFunc interface.

    Args:
        texts: List of text strings to embed.

    Returns:
        numpy array of shape (len(texts), embedding_dim).
    """
    model = _get_model()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=32,
    )
    return np.array(embeddings)


def get_embedding_dimension() -> int:
    """Get the embedding dimension for BGE-M3 (1024)."""
    return 1024

