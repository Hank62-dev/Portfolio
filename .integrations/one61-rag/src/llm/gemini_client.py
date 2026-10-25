"""Gemini LLM client using google-genai SDK."""

import json
import logging
import re
from typing import Any

from google import genai

from src.config import settings

logger = logging.getLogger(__name__)

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

class GeminiClient:
    """Class wrapper for Gemini chat that mirrors GroqClient API."""

    def __init__(self):
        self.client = _get_client()

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.5,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> dict[str, Any]:
        """Send chat completion to Gemini API (async)."""
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
        if json_mode:
            config["response_mime_type"] = "application/json"

        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = await self.client.aio.models.generate_content(
                    model=target_model,
                    contents=gemini_contents,
                    config=config,
                )
                answer = response.text
                break
            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < max_retries - 1:
                    match = re.search(r"retry in (\d+(?:\.\d+)?)s", err_str, re.IGNORECASE)
                    wait_time = float(match.group(1)) + 2.0 if match else 20.0
                    logger.warning(
                        "Gemini Rate Limit (429) hit for model '%s'. Waiting %.1fs before retry (%d/%d)...",
                        target_model,
                        wait_time,
                        attempt + 1,
                        max_retries,
                    )
                    import asyncio
                    await asyncio.sleep(wait_time)
                    continue
                logger.error("Gemini API Error: %s", e)
                raise e

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
            "model": target_model,
            "usage": {
                "prompt": (usage.prompt_token_count or 0) if usage else 0,
                "completion": (usage.candidates_token_count or 0) if usage else 0,
                "total": (usage.total_token_count or 0) if usage else 0,
            },
        }

    async def fast_chat(self, messages: list[dict[str, str]], temperature: float = 0.5, max_tokens: int = 4096, json_mode: bool = False) -> dict[str, Any]:
        """Fast chat mapped to flash-lite model."""
        return await self.chat(messages, model=settings.gemini_fast_model, temperature=temperature, max_tokens=max_tokens, json_mode=json_mode)

async def gemini_chat(messages, model=None, temperature=0.5, max_tokens=4096, json_mode=False):
    client = GeminiClient()
    return await client.chat(messages, model, temperature, max_tokens, json_mode)
