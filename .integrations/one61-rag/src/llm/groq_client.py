"""Groq LLM client with key rotation and model fallback."""

import json
import logging
from typing import Any

from groq import AsyncGroq, RateLimitError
from langfuse import get_client

from src.config import settings
from src.llm.key_rotator import KeyRotator

logger = logging.getLogger(__name__)


class GroqClient:
    def __init__(self):
        self._rotator = KeyRotator(settings.groq_keys_list)
        self._fallback_chain = [
            settings.main_model,
            settings.fallback_model,
            settings.fast_model,
        ]
        logger.info(
            "GroqClient initialized with %d keys, fallback chain: %s",
            self._rotator.total_keys,
            self._fallback_chain,
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = False,
        tools: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Send chat completion — Gemini first, Groq as fallback."""

        # --- Primary: Gemini (no rate limit issues) ---
        if settings.gemini_api_key:
            try:
                from src.llm.gemini_client import gemini_chat

                # Use fast Gemini model if fast Groq model was requested
                target_gemini_model = settings.gemini_model
                if model == settings.fast_model:
                    target_gemini_model = settings.gemini_fast_model

                return await gemini_chat(
                    messages=messages,
                    model=target_gemini_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
            except Exception as e:
                logger.warning("Gemini failed: %s, falling back to Groq...", str(e)[:100])

        # --- Fallback: Groq (when Gemini unavailable) ---
        models_to_try = [model] if model else list(self._fallback_chain)

        last_error = None
        for target_model in models_to_try:
            try:
                return await self._call(
                    messages=messages,
                    model=target_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                    tools=tools,
                )
            except RateLimitError as e:
                logger.warning("Rate limited on model %s, trying next...", target_model)
                last_error = e
                continue
            except Exception as e:
                logger.error("Error with model %s: %s", target_model, str(e))
                last_error = e
                continue

        raise RuntimeError(f"All models failed. Last error: {last_error}")

    async def fast_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> dict[str, Any]:
        """Fast chat — Gemini (or Groq 8B fallback)."""
        return await self.chat(
            messages=messages,
            model=settings.fast_model,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode,
        )

    async def strong_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = False,
        tools: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Use strong model (70B) for core RAG and verification."""
        return await self.chat(
            messages=messages,
            model=settings.main_model,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode,
            tools=tools,
        )

    async def _call(
        self,
        messages: list[dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
        tools: list[dict] | None,
    ) -> dict[str, Any]:
        """Execute a single API call with key rotation."""
        api_key = self._rotator.get_key()

        client = AsyncGroq(api_key=api_key)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            langfuse = get_client()
            with langfuse.start_as_current_observation(
                as_type="generation",
                name="groq-completion",
                model=model,
                input=messages,
                model_parameters={
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            ) as generation:
                response = await client.chat.completions.create(**kwargs)
                self._rotator.report_success(api_key)

                choice = response.choices[0]
                result: dict[str, Any] = {
                    "content": choice.message.content or "",
                    "model": response.model,
                    "usage": {
                        "prompt": response.usage.prompt_tokens if response.usage else 0,
                        "completion": response.usage.completion_tokens if response.usage else 0,
                        "total": response.usage.total_tokens if response.usage else 0,
                    },
                }

                if choice.message.tool_calls:
                    result["tool_calls"] = [
                        {
                            "id": tc.id,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in choice.message.tool_calls
                    ]

                generation.update(
                    output=result["content"] if not json_mode else result,
                    usage={
                        "input": result["usage"]["prompt"],
                        "output": result["usage"]["completion"],
                        "total": result["usage"]["total"],
                    },
                )

                return result

        except RateLimitError as e:
            retry_after = float(getattr(e, "retry_after", 60.0))
            self._rotator.report_rate_limit(api_key, retry_after)
            raise
        except Exception as e:
            self._rotator.report_error(api_key)
            raise

    def get_key_stats(self) -> dict:
        """Return key usage stats for monitoring."""
        return self._rotator.get_stats()


def parse_json_response(content: str) -> dict:
    """Safely parse JSON from LLM response, handling markdown code blocks."""
    cleaned = content.strip()

    if cleaned.startswith("```"):
        lines = cleaned.split("\n")

        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from LLM response: %s...", cleaned[:200])
        return {"raw_content": content, "parse_error": True}
