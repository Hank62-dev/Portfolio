"""Conversation Memory — Redis-backed context manager.

Stores a rolling summary of each conversation so the AI can:
1. Remember what was discussed earlier (beyond the 5-message window)
2. Resolve follow-up references ("thế còn X thì sao?")
3. Avoid repeating information already given

Architecture:
  Redis key: memory:conv:<conversationId>
  Value: JSON {summary, turns, turn_count, key_topics, last_updated}

Summary strategy:
  - First 8 turns: store raw turns (cheap, no LLM call)
  - Every 8 turns after: LLM compresses old turns + previous summary
  - Only uses fast model (8B) for summarization → minimal token cost

Fallback: If Redis is down, returns empty context. Pipeline works normally.
"""

import json
import logging
import time
from typing import Any

from src.cache.redis_client import get_redis
from src.config import settings

logger = logging.getLogger(__name__)

PREFIX = "memory:conv:"
MAX_RAW_TURNS = 20  # Keep at most 20 raw turns in Redis


class ConversationMemory:
    """Manages per-conversation memory backed by Redis."""

    def __init__(self, llm_client=None):
        self.llm = llm_client
        self.summary_interval = settings.memory_summary_interval
        self.ttl = settings.memory_ttl_seconds

    async def load(self, conversation_id: str) -> dict:
        """Load memory for a conversation.

        Returns:
            {
                "summary": str,         # Compressed summary of past context
                "recent_turns": list,   # Last few raw turns for precision
                "turn_count": int,
                "key_topics": list[str],
            }
            Returns empty dict if no memory or Redis unavailable.
        """
        redis = get_redis()
        if redis is None or not conversation_id:
            return {}

        key = f"{PREFIX}{conversation_id}"
        try:
            raw = await redis.get(key)
            if not raw:
                return {}
            data = json.loads(raw)
            logger.debug(
                "Memory loaded: conv=%s, turns=%d, summary_len=%d",
                conversation_id[:8],
                data.get("turn_count", 0),
                len(data.get("summary", "")),
            )
            return data
        except Exception as e:
            logger.warning("Memory load failed: %s", e)
            return {}

    async def update(
        self,
        conversation_id: str,
        user_message: str,
        ai_response: str,
    ) -> bool:
        """Add a new turn and optionally trigger summarization.

        Args:
            conversation_id: UUID of the conversation
            user_message: What the user asked
            ai_response: What AI replied (shortened for storage)
        """
        redis = get_redis()
        if redis is None or not conversation_id:
            return False

        key = f"{PREFIX}{conversation_id}"

        try:
            # Load existing memory
            raw = await redis.get(key)
            if raw:
                data = json.loads(raw)
            else:
                data = {
                    "summary": "",
                    "turns": [],
                    "turn_count": 0,
                    "key_topics": [],
                    "last_updated": 0,
                }

            # Append new turn (truncate long messages to save Redis memory)
            turn = {
                "user": _truncate(user_message, 200),
                "ai": _truncate(ai_response, 300),
            }
            data["turns"].append(turn)
            data["turn_count"] += 1
            data["last_updated"] = time.time()

            # Extract key topics from user message
            data["key_topics"] = _extract_topics(
                data["key_topics"],
                user_message,
            )

            # Trigger summarization if needed
            if self._should_summarize(data):
                data = await self._summarize(data)

            # Trim raw turns to prevent unbounded growth
            if len(data["turns"]) > MAX_RAW_TURNS:
                data["turns"] = data["turns"][-MAX_RAW_TURNS:]

            payload = json.dumps(data, ensure_ascii=False)
            await redis.set(key, payload, ex=self.ttl)

            logger.debug(
                "Memory updated: conv=%s, turn=%d",
                conversation_id[:8],
                data["turn_count"],
            )
            return True

        except Exception as e:
            logger.warning("Memory update failed: %s", e)
            return False

    def build_context(self, memory: dict) -> str:
        """Build a context string from memory for prompt injection.

        Returns empty string if no meaningful memory exists.
        """
        if not memory:
            return ""

        parts = []
        summary = memory.get("summary", "")
        if summary:
            parts.append(f"Tóm tắt hội thoại trước: {summary}")

        # Add last 2-3 recent turns for precision
        recent = memory.get("turns", [])[-3:]
        if recent:
            recent_text = []
            for t in recent:
                recent_text.append(f"- User: {t['user']}")
                recent_text.append(f"- AI: {t['ai']}")
            parts.append("Các lượt gần nhất:\n" + "\n".join(recent_text))

        topics = memory.get("key_topics", [])
        if topics:
            parts.append(f"Chủ đề đã thảo luận: {', '.join(topics[-5:])}")

        if not parts:
            return ""

        return "## Ngữ cảnh hội thoại (Memory)\n" + "\n\n".join(parts)

    def _should_summarize(self, data: dict) -> bool:
        """Check if we should trigger LLM summarization."""
        if self.llm is None:
            return False

        turn_count = data.get("turn_count", 0)
        turns = data.get("turns", [])

        # Summarize every N turns, but only if we have enough raw turns
        return (
            turn_count >= self.summary_interval
            and turn_count % self.summary_interval == 0
            and len(turns) >= self.summary_interval
        )

    async def _summarize(self, data: dict) -> dict:
        """Compress old turns + existing summary into a new summary.

        Uses the fast model (8B) to minimize token cost and latency.
        """
        if self.llm is None:
            return data

        from src.agents.prompts import MEMORY_SUMMARY_PROMPT

        old_summary = data.get("summary", "")
        turns = data.get("turns", [])

        # Build conversation text from turns to summarize
        # Keep most recent 3 turns raw, summarize the rest
        turns_to_summarize = turns[:-3] if len(turns) > 3 else turns
        turns_to_keep = turns[-3:] if len(turns) > 3 else []

        conv_text = ""
        if old_summary:
            conv_text += f"Tóm tắt trước đó: {old_summary}\n\n"

        conv_text += "Các lượt hội thoại mới:\n"
        for t in turns_to_summarize:
            conv_text += f"User: {t['user']}\nAI: {t['ai']}\n\n"

        messages = [
            {"role": "system", "content": MEMORY_SUMMARY_PROMPT},
            {"role": "user", "content": conv_text},
        ]

        try:
            response = await self.llm.fast_chat(
                messages=messages,
                temperature=0.1,
                max_tokens=200,
            )
            new_summary = response.get("content", "").strip()

            if new_summary and len(new_summary) > 10:
                data["summary"] = new_summary
                data["turns"] = turns_to_keep  # Keep only recent turns
                logger.info(
                    "Memory summarized: %d turns → %d chars",
                    len(turns_to_summarize),
                    len(new_summary),
                )
            else:
                logger.warning("Summarization returned empty, keeping raw turns")
        except Exception as e:
            logger.warning("Summarization failed: %s (keeping raw turns)", e)

        return data


def _truncate(text: str, max_len: int) -> str:
    """Truncate text to max_len characters."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def _extract_topics(existing: list[str], user_message: str) -> list[str]:
    """Extract key topic keywords from user message.

    Simple heuristic: extract Vietnamese noun phrases and important terms.
    No LLM needed — just keyword detection for common HR/business terms.
    """
    keywords = {
        "nghỉ phép", "phép", "leave", "ngày phép",
        "wfh", "work from home", "làm việc từ xa", "remote",
        "lương", "salary", "thưởng", "bonus",
        "bảo hiểm", "insurance", "bhxh",
        "hợp đồng", "contract",
        "thử việc", "probation",
        "đào tạo", "training",
        "đánh giá", "review", "kpi",
        "nghỉ việc", "resign", "thôi việc",
        "tuyển dụng", "recruit",
        "chính sách", "policy", "quy trình",
    }

    msg_lower = user_message.lower()
    found = [kw for kw in keywords if kw in msg_lower]

    # Merge with existing, deduplicate, keep last 10
    merged = list(dict.fromkeys(existing + found))
    return merged[-10:]
