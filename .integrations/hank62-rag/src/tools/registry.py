"""Tool Registry."""

import math
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class BaseTool(ABC):
    """Abstract base for all agent tools."""

    name: str = "base"
    description: str = "Base tool"

    @abstractmethod
    async def execute(self, **kwargs) -> str:
        """Execute the tool and return result as string."""
        ...

    def to_openai_schema(self) -> dict:
        """Convert tool to OpenAI function calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.get_parameters_schema(),
            },
        }

    @abstractmethod
    def get_parameters_schema(self) -> dict:
        """Return JSON schema for tool parameters."""
        ...


class CalculatorTool(BaseTool):
    name = "calculate"
    description = "Perform mathematical calculations. Supports basic arithmetic and common functions."

    async def execute(self, expression: str = "", **kwargs) -> str:
        try:
            # Safe eval with limited scope
            allowed = {
                "abs": abs, "round": round, "min": min, "max": max,
                "sum": sum, "pow": pow, "len": len,
                "sqrt": math.sqrt, "log": math.log, "log10": math.log10,
                "ceil": math.ceil, "floor": math.floor,
                "pi": math.pi, "e": math.e,
            }
            result = eval(expression, {"__builtins__": {}}, allowed)
            return str(result)
        except Exception as e:
            return f"Calculation error: {str(e)}"

    def get_parameters_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Math expression to evaluate, e.g. '150 + 200 + 180' or 'sqrt(144)'",
                },
            },
            "required": ["expression"],
        }


class DateTimeTool(BaseTool):
    name = "get_datetime"
    description = "Get current date, time, or do date calculations."

    async def execute(self, query: str = "now", **kwargs) -> str:
        now = datetime.now()
        if query == "now":
            return now.strftime("%Y-%m-%d %H:%M:%S")
        elif query == "date":
            return now.strftime("%Y-%m-%d")
        elif query == "time":
            return now.strftime("%H:%M:%S")
        elif query == "weekday":
            return now.strftime("%A")
        else:
            return now.isoformat()

    def get_parameters_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "What to get: 'now', 'date', 'time', 'weekday'",
                    "enum": ["now", "date", "time", "weekday"],
                },
            },
            "required": ["query"],
        }


class ToolRegistry:
    """Registry of available tools for agents."""

    def __init__(self):
        self._tools: dict[str, BaseTool] = {}
        self._register_defaults()

    def _register_defaults(self):
        """Register built-in tools."""
        self.register(CalculatorTool())
        self.register(DateTimeTool())

    def register(self, tool: BaseTool):
        """Register a new tool."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    async def execute(self, name: str, **kwargs) -> str:
        """Execute a tool by name."""
        tool = self._tools.get(name)
        if not tool:
            return f"Tool '{name}' not found"
        return await tool.execute(**kwargs)

    def get_all_schemas(self) -> list[dict]:
        """Get OpenAI function schemas for all tools."""
        return [tool.to_openai_schema() for tool in self._tools.values()]

    @property
    def available_tools(self) -> list[str]:
        return list(self._tools.keys())
