"""Internal schemas for inter-agent communication."""

from pydantic import BaseModel, Field


class ExecutionStep(BaseModel):
    """A single step in the execution plan."""

    action: str = Field(description="Action to take: retrieve, reason, tool_call, etc.")
    description: str = Field(default="")
    tool_name: str | None = None
    tool_args: dict = Field(default_factory=dict)


class GuardResult(BaseModel):
    # Guard fields
    is_valid: bool = Field(description="Whether the input is valid/processable")
    task_type: str = Field(description="Primary classified task type")
    sub_types: list[str] = Field(default_factory=list, description="Additional task types")
    is_in_domain: bool = Field(
        default=True, description="Whether the query relates to the company Warehouse/Logistics knowledge base"
    )
    cleaned_prompt: str = Field(description="Enhanced/cleaned user prompt")
    requires_clarification: bool = Field(default=False)
    clarification_message: str = Field(default="")
    detected_language: str = Field(default="vi", description="ISO 639-1 code")
    extracted_entities: dict = Field(
        default_factory=dict,
        description="Extracted entities: {person: [], date: [], ...}",
    )
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    # Router fields (merged to save an LLM call)
    route_to: str = Field(
        default="rag",
        description="Where to route: 'sql', 'rag', 'hybrid', 'direct'"
    )
    strategy: str = Field(
        default="simple_rag",
        description="Execution strategy: simple_rag, multi_step, tool_use, direct",
    )
    retrieval_mode: str = Field(
        default="hybrid",
        description="LightRAG query mode: local, global, hybrid, naive",
    )
    steps: list[ExecutionStep] = Field(default_factory=list)
    tools_needed: list[str] = Field(default_factory=list)
    estimated_complexity: str = Field(default="medium")
    direct_response: str = Field(
        default="", description="Immediate response text if strategy is 'direct'"
    )


class RAGResult(BaseModel):
    response_text: str = Field(description="Generated response text")
    reasoning_steps: list[dict] = Field(default_factory=list, description="CoT steps")
    retrieved_chunks: list[dict] = Field(
        default_factory=list,
        description="Retrieved source chunks with metadata",
    )
    structured_output: dict = Field(
        default_factory=dict,
        description="Extracted structured data (tasks, events, etc.)",
    )
    model_used: str = ""
    token_usage: dict = Field(default_factory=dict)
    knowledge_source: str = Field(
        default="rag",
        description="Where the answer came from: 'rag' or 'general_knowledge'",
    )


class SQLResult(BaseModel):
    generated_sql: str = Field(description="The final raw SQL that was executed")
    raw_results: list[dict] = Field(default_factory=list, description="Raw rows from DB")
    row_count: int = Field(default=0, description="Number of rows returned")
    response_text: str = Field(description="Final generated response for the user")
    reasoning_steps: list[dict] = Field(default_factory=list)
    model_used: str = ""
    token_usage: dict = Field(default_factory=dict)

