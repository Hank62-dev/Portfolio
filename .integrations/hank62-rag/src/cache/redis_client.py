"""Async Redis client singleton for AI Service.

Used by: Semantic Cache, Conversation Memory.
Connection: settings.redis_url (port 6382, DB 0).
"""

import logging

import redis.asyncio as aioredis

from src.config import log_redis_ready, settings

logger = logging.getLogger(__name__)

_pool: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis | None:
    """Create Redis connection pool. Called during app startup."""
    global _pool
    if _pool is not None:
        return _pool

    try:
        _pool = aioredis.from_url(
            settings.redis_url,
            decode_responses=False,
            max_connections=20,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        await _pool.ping()
        log_redis_ready(settings.redis_url)
        return _pool
    except Exception as e:
        logger.warning("Redis unavailable: %s (cache/memory disabled)", str(e))
        _pool = None
        return None


async def close_redis():
    """Close Redis pool. Called during app shutdown."""
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None
        logger.info("Redis connection closed")


def get_redis() -> aioredis.Redis | None:
    """Get the Redis pool instance. Returns None if unavailable."""
    return _pool
