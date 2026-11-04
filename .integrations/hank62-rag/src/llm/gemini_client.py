"""Gemini LLM client using google-genai SDK."""

import asyncio
import json
import logging
import random
import re
import time
from typing import Any

from google import genai

from src.config import settings

logger = logging.getLogger(__name__)


RATE_LIMIT_RETRIES = 4  # waits as long as Gemini says to
BUSY_RETRIES = 2  # a short pause each time, doubling
MAX_RATE_WAIT = 90.0  # a longer wait than this is a spent quota (usually the day's), not a busy minute


def is_busy(error_text: str) -> bool:
    """Whether Gemini failed for a reason that is likely to pass by itself: overloaded (503), a server error, or a timeout."""
    return bool(re.search(r"\b(500|503|504)\b|UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|high demand", error_text))

def is_rate_limited(error_text: str) -> bool:
    """Whether Gemini refused because a quota is used up (429), per minute or per day."""
    return "429" in error_text or "RESOURCE_EXHAUSTED" in error_text


_DURATION = r"(?:\d+(?:\.\d+)?[hms])+"


def retry_delay(error_text: str) -> float | None:
    """How long Gemini says to wait, in seconds: from "retry in 3h16m48.7s", "retry in 14.2s" or "'retryDelay': '11808s'"."""
    match = re.search(rf"retry in ({_DURATION})", error_text, re.IGNORECASE) or re.search(rf"retryDelay['\"]?: *['\"]?({_DURATION})", error_text)
    if not match:
        return None
    units = {"h": 3600.0, "m": 60.0, "s": 1.0}
    return sum(float(amount) * units[unit] for amount, unit in re.findall(r"(\d+(?:\.\d+)?)([hms])", match.group(1).lower()))


def is_spent(error_text: str) -> bool:
    """A rate limit that will not clear by waiting a moment: the per-day quota, or a wait longer than MAX_RATE_WAIT."""
    if not is_rate_limited(error_text):
        return False
    if re.search(r"PerDay|per day", error_text, re.IGNORECASE):
        return True
    delay = retry_delay(error_text)
    return delay is not None and delay > MAX_RATE_WAIT


# model -> when (time.monotonic) its spent quota comes back; until then it is asked last, so it is not tried first every time
_cooling: dict[str, float] = {}

_client = None

def _get_client():
    """Lazy-initialize the Gemini client singleton."""
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")
        _client = genai.Client(api_key=settings.gemini_api_key)
        logger.info("Gemini client initialized (model: %s)", settings.gemini_model)
    return _client

def parse_json_response(content: str) -> dict:
    """Helper to parse JSON from markdown code blocks or plain text."""
    try:
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except json.JSONDecodeError:
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        logger.warning(f"Failed to parse JSON response: {content[:200]}")
        return {"raw_content": content, "parse_error": True}

def _web_sources(response) -> list[dict[str, str]]:
    """The web pages Gemini's Google Search grounding used, as [{title, url}] without repeats."""
    seen: set[str] = set()
    sources: list[dict[str, str]] = []
    for candidate in response.candidates or []:
        metadata = getattr(candidate, "grounding_metadata", None)
        for chunk in getattr(metadata, "grounding_chunks", None) or []:
            web = getattr(chunk, "web", None)
            url = getattr(web, "uri", None)
            if url and url not in seen:
                seen.add(url)
                sources.append({"title": getattr(web, "title", None) or url, "url": url})
    return sources


class GeminiClient:
    """Class wrapper for Gemini chat that mirrors GroqClient API."""

    def __init__(self):
        self.client = _get_client()

    async def _generate(self, model: str, contents: list, config: dict):
        """One call to Gemini, waiting out a rate limit (429) and pausing briefly when the model is overloaded (503)."""
        rate_waits = 0
        busy_waits = 0
        while True:
            try:
                return await self.client.aio.models.generate_content(model=model, contents=contents, config=config)
            except Exception as e:
                err_str = str(e)
                if is_spent(err_str):
                    # the day's quota is gone: waiting is pointless, so remember it and let the caller try another model
                    _cooling[model] = time.monotonic() + min(retry_delay(err_str) or 3600.0, 6 * 3600.0)
                    logger.warning("Gemini quota for model '%s' is spent (%s).", model, err_str[:80].replace("\n", " "))
                    raise
                if is_rate_limited(err_str) and rate_waits < RATE_LIMIT_RETRIES:
                    wait_time = (retry_delay(err_str) or 18.0) + 2.0
                    rate_waits += 1
                    logger.warning("Gemini Rate Limit (429) hit for model '%s'. Waiting %.1fs before retry (%d/%d)...", model, wait_time, rate_waits, RATE_LIMIT_RETRIES)
                    await asyncio.sleep(wait_time)
                    continue
                if is_busy(err_str) and busy_waits < BUSY_RETRIES:
                    wait_time = 1.5 * 2**busy_waits + random.uniform(0, 0.5)
                    busy_waits += 1
                    logger.warning("Gemini model '%s' is busy (%s). Waiting %.1fs before retry (%d/%d)...", model, err_str[:60], wait_time, busy_waits, BUSY_RETRIES)
                    await asyncio.sleep(wait_time)
                    continue
                logger.error("Gemini API Error: %s", e)
                raise

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.5,
        max_tokens: int = 4096,
        json_mode: bool = False,
        web_search: bool = False,
    ) -> dict[str, Any]:
        """Send chat completion to Gemini API (async).

        With ``web_search`` the model may search Google while answering (Gemini's built-in grounding). The
        pages it used come back under ``sources`` as [{title, url}]. It cannot be combined with ``json_mode``.
        """
        target_model = model or settings.gemini_model

        system_instruction = None
        gemini_contents = []

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                system_instruction = content
            elif role == "assistant":
                gemini_contents.append({"role": "model", "parts": [{"text": content}]})
            else:
                gemini_contents.append({"role": "user", "parts": [{"text": content}]})

        config = {"temperature": temperature, "max_output_tokens": max_tokens}
        if system_instruction:
            config["system_instruction"] = system_instruction
        if json_mode and not web_search:
            config["response_mime_type"] = "application/json"
        if web_search:
            config["tools"] = [{"google_search": {}}]

        # An overloaded model (503) is usually over in seconds: try it again, and if it stays busy, or its quota is spent,
        # try the fallback model. A model whose quota is known to be spent goes last.
        models = [target_model]
        fallback = settings.gemini_fallback_model.strip()
        if fallback and fallback != target_model:
            models.append(fallback)
        now = time.monotonic()
        models.sort(key=lambda name: _cooling.get(name, 0.0) > now)

        response = None
        for index, candidate in enumerate(models):
            try:
                response = await self._generate(candidate, gemini_contents, config)
                target_model = candidate
                break
            except Exception as e:
                if index + 1 < len(models) and (is_busy(str(e)) or is_rate_limited(str(e))):
                    logger.warning("Gemini model '%s' cannot answer now; trying '%s' instead.", candidate, models[index + 1])
                    continue
                raise
        answer = response.text

        if not answer or not answer.strip():
            block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else None
            finish_reason = response.candidates[0].finish_reason if response.candidates else None
            raise RuntimeError(
                f"Gemini returned no text (block_reason={block_reason}, finish_reason={finish_reason})"
            )

        usage = response.usage_metadata
        # Preserve the pipeline's existing response format.
        return {
            "content": answer,
            "sources": _web_sources(response) if web_search else [],
            "model": target_model,
            "usage": {
                "prompt": (usage.prompt_token_count or 0) if usage else 0,
                "completion": (usage.candidates_token_count or 0) if usage else 0,
                "total": (usage.total_token_count or 0) if usage else 0,
            },
        }

    async def fast_chat(self, messages: list[dict[str, str]], temperature: float = 0.5, max_tokens: int = 4096, json_mode: bool = False, web_search: bool = False) -> dict[str, Any]:
        """Fast chat mapped to flash-lite model."""
        return await self.chat(messages, model=settings.gemini_fast_model, temperature=temperature, max_tokens=max_tokens, json_mode=json_mode, web_search=web_search)

async def gemini_chat(messages, model=None, temperature=0.5, max_tokens=4096, json_mode=False):
    client = GeminiClient()
    return await client.chat(messages, model, temperature, max_tokens, json_mode)
