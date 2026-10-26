"""Request schemas."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DocumentInfo(BaseModel):
    """Metadata for a user-uploaded document."""

    id: str = Field(description="Document UUID from BE")
    url: str = Field(description="Download URL (presigned or direct)")
    name: str = Field(default="unknown", description="Original filename")
    mimeType: str = Field(default="text/plain", description="MIME type")


class ChatRequest(BaseModel):
    """Internal chat request used by the pipeline."""

    request_id: str = Field(description="Unique request ID (UUID v4)")
    user_id: str = Field(description="User identifier")
    session_id: str = Field(default="", description="Conversation session ID")
    message: str = Field(description="User's raw input message")
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="Previous messages in this session [{role, content}]",
    )
    memory_context: str = Field(
        default="",
        description="Compressed conversation memory from Redis",
    )
    mode: str = Field(default="fast", description="Execution mode: fast|reasoning")
    documents: list[DocumentInfo] = Field(
        default_factory=list,
        description="User-uploaded documents to ingest for this conversation",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "request_id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user_123",
                "session_id": "session_abc",
                "message": "Chinh sach nghi phep",
                "conversation_history": [],
            }
        }
    }


class ContentType(str, Enum):
    TEXT = "text"
    MULTIMODAL_TEXT = "multimodal_text"


class MessageAuthor(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessagePart(BaseModel):
    """A single part in a multimodal message."""

    type: str
    text: str | None = None
    url: str | None = None
    alt: str | None = None
    name: str | None = None
    mimeType: str | None = None


class MessageContent(BaseModel):
    """Message content - text or multimodal."""

    contentType: ContentType
    text: str | None = None
    parts: list[MessagePart] | None = None


class UserMessage(BaseModel):
    content: MessageContent


class ConversationChatRequest(BaseModel):
    """Request from BE gateway - matches sendConversationMessageSchema."""

    conversationId: str = Field(description="Conversation UUID")
    userId: str = Field(description="User UUID")
    author: MessageAuthor = Field(default=MessageAuthor.USER)
    message: UserMessage
    mode: str = Field(default="fast", description="Execution mode: fast|reasoning")

    model_config = {
        "json_schema_extra": {
            "example": {
                "conversationId": "550e8400-e29b-41d4-a716-446655440000",
                "userId": "660e8400-e29b-41d4-a716-446655440001",
                "author": "user",
                "message": {
                    "content": {
                        "contentType": "text",
                        "text": "Chinh sach nghi phep la gi?",
                    }
                },
            }
        }
    }

    def extract_text(self) -> str:
        """Extract plain text from message content."""
        content = self.message.content
        if content.contentType == ContentType.TEXT:
            return content.text or ""
        if content.contentType == ContentType.MULTIMODAL_TEXT and content.parts:
            text_parts = [p.text for p in content.parts if p.type == "text" and p.text]
            return "\n".join(text_parts)
        return ""


class IngestRequest(BaseModel):
    """Request to ingest documents into the RAG knowledge base."""

    documents: list[str] = Field(description="List of document texts to ingest")
    source_names: list[str] = Field(
        default_factory=list,
        description="Optional names for each document (for citation)",
    )
    metadata: dict = Field(
        default_factory=dict,
        description="Additional metadata for the documents",
    )


class DashboardAnalysisRequest(BaseModel):
    """Specific request schema for dashboard analysis."""
    overview_stats: dict = Field(default_factory=dict)
    trend_last_7_days: list[dict] = Field(default_factory=list)
    top_carriers: list[dict] = Field(default_factory=list)
    top_provinces: list[dict] = Field(default_factory=list)

