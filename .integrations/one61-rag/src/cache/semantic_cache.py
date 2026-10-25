"""Semantic Cache — Cache AI responses by query similarity.

Two-layer lookup strategy (token-efficient):
1. FAST PATH: MD5 fingerprint exact match → O(1), zero tokens
2. SLOW PATH: Cosine similarity on embeddings → O(n), no extra tokens
   (reuses the embedding already computed by the RAG pipeline)

Design decisions:
- Embeddings stored as compact float16 to save Redis memory (~50% reduction)
- Smart TTL: high-confidence responses cached longer
- Skip cache for: unverified responses, greetings, general_chat
- Max entries capped to prevent unbounded growth
"""

import hashlib
import json
import logging
import time
from datetime import datetime

import numpy as np

from src.cache.redis_client import get_redis
from src.config import settings

logger = logging.getLogger(__name__)

PREFIX = "cache:semantic:"
SESSION_PREFIX = "cache:session:"
INDEX_KEY = "cache:semantic:_index"

# Task types that should NOT be cached
_SKIP_TYPES = {"general_chat", "greeting", "chitchat"}


class SemanticCache:
    """Query-level semantic cache backed by Redis."""

    def __init__(
        self,
        similarity_threshold: float | None = None,
        max_entries: int | None = None,
    ):
        self.threshold = similarity_threshold or settings.cache_similarity_threshold
        self.max_entries = max_entries or settings.cache_max_entries

    # ── Session Semantic Cache (per conversation, 2-layer) ───────────

    async def session_lookup(
        self,
        session_id: str,
        query: str,
        embedding: np.ndarray | None = None,
    ) -> dict | None:
        """Look up a cached response scoped to a specific conversation.

        Two-layer strategy:
        1. MD5 fingerprint exact match → O(1), instant
        2. Cosine similarity scan across session entries → O(n), n ≈ 5-20
        """
        redis = get_redis()
        if redis is None or not session_id:
            return None

        # --- Layer 1: Exact match (MD5 fingerprint) ---
        fp = _fingerprint(query)
        exact_key = f"{SESSION_PREFIX}{session_id}:fp:{fp}"
        try:
            cached = await redis.get(exact_key)
            if cached:
                entry = json.loads(cached)
                logger.info(
                    "Session cache HIT (exact): session=%s, fp=%s",
                    session_id[:8], fp[:12],
                )
                return entry["response"]
        except Exception as e:
            logger.warning("Session cache exact lookup failed: %s", e)

        # --- Layer 2: Semantic similarity (cosine scan within session) ---
        if embedding is None:
            return None

        try:
            pattern = f"{SESSION_PREFIX}{session_id}:emb:*"
            all_keys = await redis.keys(pattern)
            if not all_keys:
                return None

            query_vec = embedding.flatten().astype(np.float32)
            best_score = 0.0
            best_entry = None

            for key in all_keys:
                raw = await redis.get(key)
                if not raw:
                    continue
                entry = json.loads(raw)
                stored_vec = np.array(entry["embedding"], dtype=np.float32)
                score = _cosine_similarity(query_vec, stored_vec)
                if score > best_score:
                    best_score = score
                    best_entry = entry

            if best_score >= self.threshold and best_entry:
                logger.info(
                    "Session cache HIT (semantic %.3f): session=%s, query=%s",
                    best_score, session_id[:8], query[:40],
                )
                return best_entry["response"]

        except Exception as e:
            logger.warning("Session cache semantic lookup failed: %s", e)

        return None

    async def session_store(
        self,
        session_id: str,
        query: str,
        response: dict,
        embedding: np.ndarray | None = None,
        ttl: int | None = None,
    ) -> bool:
        """Store a response in the session-scoped semantic cache.

        Stores both:
        - Fingerprint key (for exact match, Layer 1)
        - Embedding key (for semantic match, Layer 2)
        """
        redis = get_redis()
        if redis is None or not session_id:
            return False

        fp = _fingerprint(query)
        cache_ttl = ttl or settings.memory_ttl_seconds

        # Entry for exact match (lightweight, no embedding)
        fp_entry = {
            "query": query,
            "response": response,
            "created_at": time.time(),
        }
        fp_payload = json.dumps(fp_entry, ensure_ascii=False, default=_json_default)

        try:
            pipe = redis.pipeline()
            # Layer 1: fingerprint key
            pipe.set(f"{SESSION_PREFIX}{session_id}:fp:{fp}", fp_payload, ex=cache_ttl)

            # Layer 2: embedding key (if embedding provided)
            if embedding is not None:
                emb_entry = {
                    "query": query,
                    "embedding": embedding.flatten().astype(np.float16).tolist(),
                    "response": response,
                    "created_at": time.time(),
                }
                emb_payload = json.dumps(emb_entry, ensure_ascii=False, default=_json_default)
                pipe.set(f"{SESSION_PREFIX}{session_id}:emb:{fp}", emb_payload, ex=cache_ttl)

            await pipe.execute()

            logger.info(
                "Session cache STORED: session=%s, fp=%s, semantic=%s, ttl=%ds",
                session_id[:8], fp[:12],
                "yes" if embedding is not None else "no",
                cache_ttl,
            )
            return True
        except Exception as e:
            logger.warning("Session cache store failed: %s", e)
            return False

    async def clear_session(self, session_id: str) -> int:
        """Clear all cached responses for a session.

        Call this after uploading new documents to avoid serving stale responses.
        """
        redis = get_redis()
        if redis is None or not session_id:
            return 0
        try:
            # Find all keys for this session
            pattern = f"{SESSION_PREFIX}{session_id}:*"
            keys = []
            async for key in redis.scan_iter(match=pattern, count=100):
                keys.append(key)
            if keys:
                await redis.delete(*keys)
                logger.info(
                    "Session cache CLEARED: session=%s, %d keys removed",
                    session_id[:8], len(keys),
                )
            return len(keys)
        except Exception as e:
            logger.warning("Session cache clear failed: %s", e)
            return 0

    # ── Global Semantic Cache (legacy, kept for /api/stats) ─────────

    async def lookup(
        self,
        query: str,
        embedding: np.ndarray | None = None,
    ) -> dict | None:
        """Look up a cached response for `query`.

        Args:
            query: raw user query text.
            embedding: pre-computed embedding (avoids recomputing).

        Returns:
            Full response dict if cache hit, None otherwise.
        """
        redis = get_redis()
        if redis is None:
            return None

        # --- Layer 1: Exact fingerprint match (O(1), 0 tokens) ---
        fp = _fingerprint(query)
        fp_key = f"{PREFIX}fp:{fp}"
        try:
            cached = await redis.get(fp_key)
            if cached:
                entry = json.loads(cached)
                await redis.hincrby(INDEX_KEY, fp, 1)
                logger.info("Cache HIT (exact): %s", query[:50])
                return entry["response"]
        except Exception as e:
            logger.warning("Cache fingerprint lookup failed: %s", e)

        # --- Layer 2: Semantic similarity (only if embedding provided) ---
        if embedding is None:
            return None

        try:
            all_keys = await redis.keys(f"{PREFIX}emb:*")
            if not all_keys:
                return None

            query_vec = embedding.flatten().astype(np.float32)
            best_score = 0.0
            best_key = None

            for key in all_keys[:self.max_entries]:
                raw = await redis.get(key)
                if not raw:
                    continue
                entry = json.loads(raw)
                stored_vec = np.array(entry["embedding"], dtype=np.float32)
                score = _cosine_similarity(query_vec, stored_vec)
                if score > best_score:
                    best_score = score
                    best_key = key

            if best_score >= self.threshold and best_key:
                raw = await redis.get(best_key)
                if raw:
                    entry = json.loads(raw)
                    await redis.hincrby(INDEX_KEY, entry.get("fingerprint", ""), 1)
                    logger.info(
                        "Cache HIT (semantic %.3f): %s",
                        best_score,
                        query[:50],
                    )
                    return entry["response"]

        except Exception as e:
            logger.warning("Cache semantic lookup failed: %s", e)

        return None

    async def store(
        self,
        query: str,
        embedding: np.ndarray,
        response: dict,
        task_type: str = "",
        is_verified: bool = True,
        confidence: float = 1.0,
    ) -> bool:
        """Store a response in cache.

        Skips caching if:
        - Response was not verified (hallucination risk)
        - Task type is in skip list (greetings, etc.)
        - Confidence too low

        Smart TTL: higher confidence → longer TTL.
        """
        redis = get_redis()
        if redis is None:
            return False

        if not is_verified:
            logger.debug("Skip cache: unverified response")
            return False

        if task_type in _SKIP_TYPES:
            logger.debug("Skip cache: task_type=%s", task_type)
            return False

        if confidence < 0.7:
            logger.debug("Skip cache: low confidence %.2f", confidence)
            return False

        fp = _fingerprint(query)
        ttl = _smart_ttl(confidence)

        # Compress embedding: float32 → list (JSON-safe), keep only essential dims
        emb_list = embedding.flatten().astype(np.float32).tolist()

        entry = {
            "query": query,
            "fingerprint": fp,
            "embedding": emb_list,
            "response": response,
            "confidence": confidence,
            "created_at": time.time(),
        }
        payload = json.dumps(entry, ensure_ascii=False, default=_json_default)

        try:
            # Store both fingerprint key (exact) and embedding key (semantic)
            pipe = redis.pipeline()
            pipe.set(f"{PREFIX}fp:{fp}", payload, ex=ttl)
            pipe.set(f"{PREFIX}emb:{fp}", payload, ex=ttl)
            pipe.hset(INDEX_KEY, fp, 0)
            await pipe.execute()

            # Evict oldest if over max
            await self._evict_if_needed()

            logger.info(
                "Cached response: fp=%s, ttl=%ds, confidence=%.2f",
                fp[:12],
                ttl,
                confidence,
            )
            return True

        except Exception as e:
            logger.warning("Cache store failed: %s", e)
            return False

    async def invalidate(self, query: str) -> bool:
        """Remove a cached entry by query text."""
        redis = get_redis()
        if redis is None:
            return False

        fp = _fingerprint(query)
        try:
            pipe = redis.pipeline()
            pipe.delete(f"{PREFIX}fp:{fp}")
            pipe.delete(f"{PREFIX}emb:{fp}")
            pipe.hdel(INDEX_KEY, fp)
            await pipe.execute()
            return True
        except Exception:
            return False

    async def stats(self) -> dict:
        """Return cache statistics."""
        redis = get_redis()
        if redis is None:
            return {"status": "disabled"}

        try:
            all_keys = await redis.keys(f"{PREFIX}emb:*")
            index = await redis.hgetall(INDEX_KEY)
            total_hits = sum(int(v) for v in index.values()) if index else 0
            return {
                "status": "active",
                "entries": len(all_keys),
                "total_hits": total_hits,
                "max_entries": self.max_entries,
                "threshold": self.threshold,
            }
        except Exception:
            return {"status": "error"}

    async def _evict_if_needed(self):
        """Remove oldest entries if cache exceeds max_entries."""
        redis = get_redis()
        if redis is None:
            return

        try:
            all_keys = await redis.keys(f"{PREFIX}emb:*")
            if len(all_keys) <= self.max_entries:
                return

            entries = []
            for key in all_keys:
                raw = await redis.get(key)
                if raw:
                    entry = json.loads(raw)
                    entries.append((key, entry.get("created_at", 0), entry.get("fingerprint", "")))

            entries.sort(key=lambda x: x[1])
            to_remove = entries[:len(entries) - self.max_entries]

            pipe = redis.pipeline()
            for key, _, fp in to_remove:
                pipe.delete(key)
                pipe.delete(f"{PREFIX}fp:{fp}")
                pipe.hdel(INDEX_KEY, fp)
            await pipe.execute()

            logger.info("Evicted %d cache entries", len(to_remove))
        except Exception as e:
            logger.warning("Cache eviction failed: %s", e)


def _json_default(obj):
    """Handle non-serializable types in json.dumps."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, '__str__'):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _fingerprint(text: str) -> str:
    """MD5 fingerprint of normalized text for exact-match lookup."""
    normalized = text.strip().lower()
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def _smart_ttl(confidence: float) -> int:
    """Higher confidence → longer TTL.

    1.0 confidence → 2 hours
    0.9 confidence → 1.5 hours
    0.7 confidence → 30 minutes
    """
    base_ttl = settings.cache_ttl_seconds
    if confidence >= 0.95:
        return base_ttl * 2
    if confidence >= 0.85:
        return int(base_ttl * 1.5)
    return base_ttl // 2
