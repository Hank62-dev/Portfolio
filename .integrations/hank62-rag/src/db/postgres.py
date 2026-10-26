"""Async Postgres client for shared conversation database."""

import json
import logging
from typing import Any

import asyncpg

from src.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool():
    """Create connection pool. Called during app startup."""
    global _pool
    if _pool is not None:
        return

    try:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=10,
        )
        logger.info("Postgres pool created: %s", settings.database_url.split("@")[-1])
    except Exception as e:
        logger.warning("Postgres pool init failed: %s (will work without history)", str(e))
        _pool = None


async def close_pool():
    """Close connection pool. Called during app shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Postgres pool closed")


async def get_conversation_history(
    conversation_id: str,
    limit: int = 5,
) -> list[dict[str, str]]:
    """Query last N messages from a conversation, ordered oldest-first.

    Returns list of {role, content} dicts compatible with LLM chat format.
    """
    if _pool is None:
        logger.warning("No Postgres pool, returning empty history")
        return []

    query = """
        SELECT author, content_type, content
        FROM messages
        WHERE conversation_id = $1
          AND status != 'sending'
        ORDER BY created_at DESC
        LIMIT $2
    """

    try:
        rows = await _pool.fetch(query, conversation_id, limit)
    except Exception as e:
        logger.error("Failed to query conversation history: %s", str(e))
        return []

    history = []
    for row in reversed(rows):
        role = _map_author_to_role(row["author"])
        text = _extract_text_from_content(row["content"], row["content_type"])
        if text:
            history.append({"role": role, "content": text})

    logger.info(
        "Loaded %d messages from conversation %s",
        len(history),
        conversation_id[:8],
    )
    return history


def _map_author_to_role(author: str) -> str:
    """Map Prisma MessageAuthor enum to LLM chat role."""
    mapping = {
        "user": "user",
        "assistant": "assistant",
        "system": "system",
    }
    return mapping.get(author, "user")


def _extract_text_from_content(content: Any, content_type: str) -> str:
    """Extract plain text from message content JSON.

    Handles both formats:
    - text: {"contentType": "text", "text": "..."}
    - multimodal_text: {"contentType": "multimodal_text", "parts": [...]}
    """
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            return content

    if not isinstance(content, dict):
        return str(content) if content else ""

    ct = content.get("contentType", content_type)

    if ct == "text":
        return content.get("text", "")

    if ct == "multimodal_text":
        parts = content.get("parts", [])
        text_parts = [p.get("text", "") for p in parts if p.get("type") == "text"]
        return "\n".join(text_parts)

    return content.get("text", str(content))


async def get_conversation_documents(conversation_id: str) -> list[dict]:
    """Query documents linked to a conversation from BE's Postgres.

    Returns list of {id, url, name, mimeType} dicts.
    Gracefully returns [] if table doesn't exist or query fails.
    """
    if _pool is None:
        return []

    # Try common BE table patterns for document storage
    queries = [
        # Pattern 1: Separate documents table
        """
        SELECT id, url, name, "mimeType"
        FROM documents
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        """,
        # Pattern 2: Attachments table
        """
        SELECT id, url, name, "mimeType"
        FROM attachments
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        """,
        # Pattern 3: Files table
        """
        SELECT id, url, name, "mimeType"
        FROM files
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        """,
    ]

    for query in queries:
        try:
            rows = await _pool.fetch(query, conversation_id)
            documents = []
            for row in rows:
                documents.append({
                    "id": str(row["id"]),
                    "url": str(row.get("url", "")),
                    "name": str(row.get("name", "unknown")),
                    "mimeType": str(row.get("mimeType", "text/plain")),
                })
            if documents:
                logger.info(
                    "Found %d documents for conversation %s",
                    len(documents), conversation_id[:8],
                )
            return documents
        except Exception:
            # Table doesn't exist or schema mismatch, try next pattern
            continue

    logger.debug("No document table found for conversation %s", conversation_id[:8])
    return []

