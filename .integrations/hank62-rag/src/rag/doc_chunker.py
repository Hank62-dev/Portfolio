"""Text chunker — sliding window with recursive separators.

Splits text into overlapping chunks for embedding and retrieval.
No external dependencies (no LangChain needed).
"""

import logging

logger = logging.getLogger(__name__)

# Separator hierarchy: try to split at semantic boundaries first
_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]


def chunk_text(
    text: str,
    chunk_size: int = 512,
    overlap: int = 50,
    min_chunk_size: int = 20,
) -> list[str]:
    """Split text into overlapping chunks using recursive separators.

    Args:
        text: Full document text.
        chunk_size: Target characters per chunk.
        overlap: Number of characters to overlap between chunks.
        min_chunk_size: Minimum chunk length (shorter chunks are discarded).

    Returns:
        List of text chunks.
    """
    if not text or not text.strip():
        return []

    text = text.strip()

    # Short text: return as single chunk
    if len(text) <= chunk_size:
        return [text]

    # Split recursively using separator hierarchy
    raw_chunks = _recursive_split(text, chunk_size, _SEPARATORS)

    # Merge very small chunks with neighbors
    merged = _merge_small_chunks(raw_chunks, chunk_size, min_chunk_size)

    # Apply overlap by prepending tail of previous chunk
    result = _apply_overlap(merged, overlap)

    logger.info(
        "Chunked %d chars -> %d chunks (target=%d, overlap=%d)",
        len(text), len(result), chunk_size, overlap,
    )
    return result


def _recursive_split(text: str, chunk_size: int, separators: list[str]) -> list[str]:
    """Recursively split text by separators until chunks fit within chunk_size."""
    if len(text) <= chunk_size:
        return [text]

    if not separators:
        # No more separators: hard split by chunk_size
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

    sep = separators[0]
    remaining_seps = separators[1:]

    parts = text.split(sep)

    chunks = []
    current = ""

    for part in parts:
        candidate = f"{current}{sep}{part}" if current else part

        if len(candidate) <= chunk_size:
            current = candidate
        else:
            # Current buffer is full, flush it
            if current:
                chunks.append(current)
            # If the new part itself is too large, split it further
            if len(part) > chunk_size:
                sub_chunks = _recursive_split(part, chunk_size, remaining_seps)
                chunks.extend(sub_chunks)
                current = ""
            else:
                current = part

    if current:
        chunks.append(current)

    return chunks


def _merge_small_chunks(
    chunks: list[str], chunk_size: int, min_size: int,
) -> list[str]:
    """Merge chunks that are too small with their neighbors."""
    if not chunks:
        return []

    merged = []
    buffer = ""

    for chunk in chunks:
        if buffer:
            candidate = f"{buffer} {chunk}"
            if len(candidate) <= chunk_size:
                buffer = candidate
                continue
            else:
                merged.append(buffer)
                buffer = chunk
        else:
            buffer = chunk

    if buffer:
        # If last buffer is tiny, merge with previous
        if len(buffer) < min_size and merged:
            prev = merged.pop()
            merged.append(f"{prev} {buffer}")
        else:
            merged.append(buffer)

    return merged


def _apply_overlap(chunks: list[str], overlap: int) -> list[str]:
    """Add overlap by prepending the tail of the previous chunk."""
    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    result = [chunks[0]]
    for i in range(1, len(chunks)):
        prev_tail = chunks[i - 1][-overlap:]
        # Find a clean word boundary in the overlap
        space_idx = prev_tail.find(" ")
        if space_idx > 0:
            prev_tail = prev_tail[space_idx + 1:]
        result.append(f"{prev_tail} {chunks[i]}")

    return result
