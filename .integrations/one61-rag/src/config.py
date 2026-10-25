"""HKT AI Service - Configuration Management."""

import logging

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Groq API ---
    groq_api_keys: str = Field(
        default="",
        description="Comma-separated Groq API keys for rotation",
    )

    # --- Model Configuration ---
    main_model: str = Field(
        default="llama-3.3-70b-versatile",
        description="Primary model for RAG and verification (strong reasoning)",
    )
    fast_model: str = Field(
        default="llama-3.1-8b-instant",
        description="Fast model for guard/router agents (lightweight tasks)",
    )
    fallback_model: str = Field(
        default="gpt-oss-120b",
        description="Fallback model when main model hits rate limits",
    )

    # --- Gemini API ---
    gemini_api_key: str = Field(
        default="",
        description="Google Gemini API key (from aistudio.google.com/apikey)",
    )
    gemini_model: str = Field(
        default="gemini-3.8-flash",
        description="Gemini model for fallback (or primary)",
    )
    gemini_fast_model: str = Field(
        default="gemini-3.5-flash-lite",
        description="Lighter Gemini model for guard/router tasks",
    )

    # --- Embedding ---
    embedding_model: str = Field(default="BAAI/bge-m3")
    embedding_dimension: int = Field(default=1024)
    embedding_device: str = Field(default="cpu")

    # --- Qdrant ---
    qdrant_host: str = Field(default="localhost")
    qdrant_port: int = Field(default=6333)
    qdrant_collection: str = Field(default="hkt_rag")

    # --- Postgres (Warehouse DB) ---
    database_url: str = Field(
        default="postgresql://one61_rag:one61_rag@localhost:5979/one61_rag",
        description="Postgres connection string for warehouse DB",
    )

    # --- BE Callback ---
    callback_url: str = Field(
        default="",
        description="URL to POST AI response back to BE",
    )

    # --- BullMQ (BE job queue) ---
    enable_bullmq: bool = Field(default=False, description="Enable BullMQ worker for external BE queue")
    bullmq_redis_host: str = Field(default="localhost")
    bullmq_redis_port: int = Field(default=6380)
    bullmq_redis_password: str = Field(default="password")

    # --- Redis (AI cache + memory) ---
    redis_url: str = Field(default="redis://localhost:6382/0")
    cache_ttl_seconds: int = Field(default=3600)
    cache_similarity_threshold: float = Field(
        default=0.92,
        description="Cosine similarity threshold for semantic cache hit",
    )
    cache_max_entries: int = Field(
        default=500,
        description="Max cached responses before eviction",
    )
    memory_summary_interval: int = Field(
        default=8,
        description="Summarize conversation after N turns",
    )
    memory_ttl_seconds: int = Field(
        default=86400,
        description="Conversation memory TTL (24h)",
    )

    # --- LightRAG ---
    lightrag_working_dir: str = Field(default="./data/lightrag_storage")

    # --- User Document Store ---
    user_docs_collection: str = Field(
        default="hkt_user_docs",
        description="Qdrant collection name for user-uploaded documents",
    )
    user_docs_chunk_size: int = Field(
        default=512,
        description="Characters per chunk for user documents",
    )
    user_docs_chunk_overlap: int = Field(
        default=50,
        description="Overlap characters between chunks",
    )

    # --- Server ---
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=4)
    log_level: str = Field(default="info")
    debug: bool = Field(default=False, validation_alias="AI_DEBUG")

    # --- Anti-Hallucination Thresholds ---
    confidence_threshold: float = Field(
        default=0.7,
        description="Minimum confidence score to approve response",
    )
    groundedness_threshold: float = Field(
        default=0.5,
        description="Minimum groundedness score before refusing",
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "allow"}

    @property
    def groq_keys_list(self) -> list[str]:
        """Parse comma-separated keys into list."""
        return [k.strip() for k in self.groq_api_keys.split(",") if k.strip()]


def log_redis_ready(redis_url: str) -> None:
    """Log after Redis client has connected and responded to PING (see init_redis)."""
    logging.getLogger(__name__).info("Redis ready: %s", redis_url)


settings = Settings()
