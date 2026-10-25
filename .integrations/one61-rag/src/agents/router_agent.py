"""Router Agent - execution strategy selection."""

from src.agents.base import BaseAgent
from src.agents.prompts import ROUTER_SYSTEM_PROMPT
from src.llm.gemini_client import parse_json_response
from src.schemas.internal import ExecutionPlan, ExecutionStep, GuardResult


class RouterAgent(BaseAgent):
    name = "router"

    async def execute(self, guard_result: GuardResult) -> ExecutionPlan:
        """Determine optimal execution strategy.

        Args:
            guard_result: Output from Guard Agent.

        Returns:
            ExecutionPlan with strategy, retrieval mode, steps, and tools.
        """
        context = (
            f"Task type: {guard_result.task_type}\n"
            f"Sub types: {guard_result.sub_types}\n"
            f"Cleaned prompt: {guard_result.cleaned_prompt}\n"
            f"Entities: {guard_result.extracted_entities}\n"
            f"Language: {guard_result.detected_language}"
        )

        messages = self._build_messages(
            system_prompt=ROUTER_SYSTEM_PROMPT,
            user_message=f"Plan execution for this request:\n\n{context}",
        )

        response = await self.llm.fast_chat(
            messages=messages,
            json_mode=True,
            temperature=0.1,
            max_tokens=1024,
        )

        parsed = parse_json_response(response["content"])

        if parsed.get("parse_error"):
            return ExecutionPlan(
                strategy="simple_rag",
                retrieval_mode="hybrid",
                estimated_complexity="medium",
            )

        steps = [
            ExecutionStep(
                action=s.get("action", "retrieve"),
                description=s.get("description", ""),
                tool_name=s.get("tool_name"),
                tool_args=s.get("tool_args", {}),
            )
            for s in parsed.get("steps", [])
        ]

        return ExecutionPlan(
            strategy=parsed.get("strategy", "simple_rag"),
            retrieval_mode=parsed.get("retrieval_mode", "hybrid"),
            steps=steps,
            tools_needed=parsed.get("tools_needed", []),
            estimated_complexity=parsed.get("estimated_complexity", "medium"),
        )
