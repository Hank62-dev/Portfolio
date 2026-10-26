"""Base Agent - abstract class all agents inherit from."""

import logging
import time
from abc import ABC, abstractmethod
from typing import Any

from langfuse import get_client

from src.llm.gemini_client import GeminiClient


class BaseAgent(ABC):
    """Abstract base for all agents in the pipeline.

    Provides:
    - Shared LLM client access
    - Structured logging
    - Execution timing
    - Error handling wrapper
    """

    name: str = "base"

    def __init__(self, llm_client: GeminiClient):
        self.llm = llm_client
        self.logger = logging.getLogger(f"agent.{self.name}")

    async def run(self, input_data: Any) -> Any:
        """Execute agent with timing and error handling."""
        start = time.time()
        self.logger.info("%s agent started", self.name)

        langfuse = get_client()
        with langfuse.start_as_current_observation(
            as_type="span",
            name=f"{self.name}-agent",
            input=input_data,
        ) as span:
            try:
                result = await self.execute(input_data)

                try:
                    span.update(output=result.model_dump())
                except AttributeError:
                    try:
                        span.update(output=result.dict())
                    except AttributeError:
                        span.update(output=str(result))

                elapsed_ms = int((time.time() - start) * 1000)
                self.logger.info("%s agent completed in %dms", self.name, elapsed_ms)
                return result
            except Exception as e:
                span.update(level="ERROR", status_message=str(e))
                elapsed_ms = int((time.time() - start) * 1000)
                self.logger.error("%s agent failed after %dms: %s", self.name, elapsed_ms, str(e))
                raise

    @abstractmethod
    async def execute(self, input_data: Any) -> Any:
        """Agent-specific logic. Override in subclasses."""
        ...

    def _build_messages(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict] | None = None,
    ) -> list[dict[str, str]]:
        """Build chat messages list with optional conversation history."""
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})
        return messages
