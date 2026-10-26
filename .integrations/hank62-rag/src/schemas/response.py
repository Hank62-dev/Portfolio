"""Response schemas."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field



class ResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    CLARIFICATION_NEEDED = "clarification_needed"


class TaskType(str, Enum):
    QUERY = "query"
    SUMMARIZE = "summarize"
    COMPARE = "compare"
    CREATE_TASK = "create_task"
    CREATE_EVENT = "create_event"
    ANALYZE = "analyze"
    EXPLAIN = "explain"
    LIST = "list"
    GENERAL_CHAT = "general_chat"



class TaskClassification(BaseModel):

    task_type: TaskType = Field(description="Primary task type")
    sub_types: list[TaskType] = Field(
        default_factory=list,
        description="Secondary task types (multi-intent)",
    )
    confidence: float = Field(ge=0.0, le=1.0)


class ReasoningStep(BaseModel):

    step: int
    thought: str = Field(description="What the agent is thinking")
    action: str = Field(default="")
    result: str = Field(default="")


class StructuredTask(BaseModel):

    title: str
    description: str = ""
    priority: str = "medium"
    due_date: str | None = None


class StructuredEvent(BaseModel):

    title: str
    start_time: str | None = None
    end_time: str | None = None
    location: str = ""


class StructuredData(BaseModel):

    tasks: list[StructuredTask] = Field(default_factory=list)
    events: list[StructuredEvent] = Field(default_factory=list)
    custom: dict[str, Any] = Field(
        default_factory=dict,
        description="Domain-specific structured data",
    )


class ResponseBody(BaseModel):

    message: str = Field(description="Human-readable response text")
    reasoning_trace: list[ReasoningStep] = Field(
        default_factory=list,
        description="Chain-of-Thought reasoning steps (visible to judges)",
    )
    structured_data: StructuredData = Field(
        default_factory=StructuredData,
        description="Extracted structured data for FE/BE",
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions or actions",
    )


class Citation(BaseModel):

    source_id: str = Field(description="Document identifier")
    source_name: str = Field(default="")
    chunk_text: str = Field(default="")
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)


class Verification(BaseModel):

    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Overall response confidence",
    )
    groundedness_score: float = Field(
        ge=0.0, le=1.0,
        description="Fraction of claims supported by sources",
    )
    is_verified: bool = Field(description="Whether response passed verification")
    hallucination_flags: list[str] = Field(
        default_factory=list,
        description="Specific claims flagged as potentially hallucinated",
    )
    disclaimer: str | None = Field(
        default=None,
        description="Disclaimer if confidence is borderline",
    )


class TokenUsage(BaseModel):
    prompt: int = 0
    completion: int = 0
    total: int = 0


class RetrievalStats(BaseModel):
    documents_retrieved: int = 0
    graph_entities_matched: int = 0
    retrieval_mode: str = "hybrid"


class ResponseMetadata(BaseModel):

    model_used: str = ""
    processing_time_ms: int = 0
    tokens_used: TokenUsage = Field(default_factory=TokenUsage)
    retrieval_stats: RetrievalStats = Field(default_factory=RetrievalStats)
    agents_trace: list[str] = Field(default_factory=list)
    knowledge_source: str = Field(
        default="rag",
        description="'rag' = from knowledge base, 'general_knowledge' = from LLM general knowledge",
    )
    cache_hit: bool = Field(
        default=False,
        description="True if response was served from semantic cache",
    )


class ErrorDetail(BaseModel):
    code: str = Field(description="Error code: RATE_LIMIT, INVALID_INPUT, INTERNAL_ERROR")
    message: str = Field(description="Human-readable error description")
    retry_after_ms: int | None = None



class ChatResponse(BaseModel):

    request_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: ResponseStatus

    task_classification: TaskClassification | None = None
    response: ResponseBody | None = None
    citations: list[Citation] = Field(default_factory=list)
    verification: Verification | None = None
    metadata: ResponseMetadata = Field(default_factory=ResponseMetadata)

    # Error fields
    error: ErrorDetail | None = None

    model_config = {"json_schema_extra": {
        "example": {
            "request_id": "550e8400-e29b-41d4-a716-446655440000",
            "timestamp": "2026-04-06T08:00:00Z",
            "status": "success",
            "task_classification": {
                "task_type": "query",
                "sub_types": [],
                "confidence": 0.95,
            },
            "response": {
                "message": "Theo chính sách công ty...",
                "reasoning_trace": [
                    {"step": 1, "thought": "Cần tìm thông tin về nghỉ phép", "action": "search_knowledge", "result": "Tìm thấy 3 tài liệu"},
                ],
                "structured_data": {"tasks": [], "events": [], "custom": {}},
                "suggestions": ["Bạn muốn biết thêm về ngày phép tối đa?"],
            },
            "citations": [
                {"source_id": "doc_001", "source_name": "HR_Policy.pdf", "chunk_text": "...", "relevance_score": 0.92},
            ],
            "verification": {
                "confidence_score": 0.87,
                "groundedness_score": 0.91,
                "is_verified": True,
                "hallucination_flags": [],
            },
            "metadata": {
                "model_used": "llama-3.3-70b-versatile",
                "processing_time_ms": 1250,
                "tokens_used": {"prompt": 1500, "completion": 400, "total": 1900},
                "retrieval_stats": {"documents_retrieved": 5, "graph_entities_matched": 12, "retrieval_mode": "hybrid"},
                "agents_trace": ["guard", "router", "rag", "verification"],
            },
        }
    }}



def create_error_response(
    request_id: str,
    code: str,
    message: str,
    retry_after_ms: int | None = None,
) -> ChatResponse:
    """Create standardized error response."""
    return ChatResponse(
        request_id=request_id,
        status=ResponseStatus.ERROR,
        error=ErrorDetail(code=code, message=message, retry_after_ms=retry_after_ms),
    )


def create_clarification_response(
    request_id: str,
    message: str,
    suggestions: list[str],
    classification: TaskClassification | None = None,
) -> ChatResponse:
    """Create clarification response when input is ambiguous."""
    return ChatResponse(
        request_id=request_id,
        status=ResponseStatus.CLARIFICATION_NEEDED,
        task_classification=classification,
        response=ResponseBody(message=message, suggestions=suggestions),
    )


class DashboardAnalysisResponse(BaseModel):
    """Specific response schema for dashboard analysis."""
    message: str

