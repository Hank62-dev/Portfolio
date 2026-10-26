"""Guard Agent - input validation, classification, and routing."""

from src.agents.base import BaseAgent
from src.agents.prompts import GUARD_SYSTEM_PROMPT
from src.llm.gemini_client import parse_json_response
from src.schemas.internal import ExecutionStep, GuardResult


class GuardAgent(BaseAgent):
    name = "guard"

    async def execute(self, input_data: dict) -> GuardResult:
        """Validate, classify, and route user input in one step.

        Args:
            input_data: Dict containing 'raw_message' and 'memory_context'

        Returns:
            GuardResult with classification, routing strategy, and direct response.
        """
        raw_message = input_data.get("raw_message", "")
        memory_context = input_data.get("memory_context", "")

        user_message_content = ""
        if memory_context:
            user_message_content += f"{memory_context}\n\n"
        user_message_content += f"Analyze this user input:\n\n{raw_message}"

        messages = self._build_messages(
            system_prompt=GUARD_SYSTEM_PROMPT,
            user_message=user_message_content,
        )

        response = await self.llm.fast_chat(
            messages=messages,
            json_mode=True,
            temperature=0.1,
            max_tokens=1024,
        )

        parsed = parse_json_response(response["content"])

        # Handle parse errors gracefully
        if parsed.get("parse_error"):
            return GuardResult(
                is_valid=True,
                task_type="general_chat",
                cleaned_prompt=raw_message,
                confidence=0.3,
                strategy="direct",
                direct_response="I'm having trouble understanding. Could you rephrase?",
            )

        # Defensive: LLM sometimes returns task_type as list for multi-intent
        raw_task_type = parsed.get("task_type", "query")
        raw_sub_types = parsed.get("sub_types", [])

        if isinstance(raw_task_type, list):
            # First element is primary, rest become sub_types
            primary = raw_task_type[0] if raw_task_type else "query"
            extra = raw_task_type[1:] if len(raw_task_type) > 1 else []
            raw_sub_types = list(
                set(extra + (raw_sub_types if isinstance(raw_sub_types, list) else []))
            )
            raw_task_type = primary

        if not isinstance(raw_sub_types, list):
            raw_sub_types = [raw_sub_types] if raw_sub_types else []

        steps = [
            ExecutionStep(
                action=s.get("action", "retrieve"),
                description=s.get("description", ""),
                tool_name=s.get("tool_name"),
                tool_args=s.get("tool_args", {}),
            )
            for s in parsed.get("steps", [])
        ]

        return GuardResult(
            is_valid=parsed.get("is_valid", True),
            task_type=str(raw_task_type),
            sub_types=[str(s) for s in raw_sub_types],
            is_in_domain=bool(parsed.get("is_in_domain", True)),
            cleaned_prompt=str(parsed.get("cleaned_prompt", raw_message)),
            requires_clarification=bool(parsed.get("requires_clarification", False)),
            clarification_message=str(parsed.get("clarification_message", "")),
            detected_language=str(parsed.get("detected_language", "vi")),
            extracted_entities=parsed.get("extracted_entities", {}),
            confidence=float(parsed.get("confidence", 0.5)),
            route_to=str(parsed.get("route_to", "rag")),
            strategy=str(parsed.get("strategy", "simple_rag")),
            retrieval_mode=str(parsed.get("retrieval_mode", "hybrid")),
            estimated_complexity=str(parsed.get("estimated_complexity", "medium")),
            tools_needed=parsed.get("tools_needed", []),
            steps=steps,
            direct_response=str(parsed.get("direct_response", "")),
        )
