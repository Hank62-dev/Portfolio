"""BullMQ Worker - consumes jobs from conversation-queue and processes AI pipeline."""

import asyncio
import logging
import uuid
from typing import Any

import httpx
from bullmq import Worker

from src.config import settings
from src.db.postgres import get_conversation_history
from src.schemas.request import ChatRequest, DocumentInfo

logger = logging.getLogger(__name__)

QUEUE_NAME = "conversation-queue"
JOB_TIMEOUT_SECONDS = 180
CALLBACK_MAX_RETRIES = 3
CALLBACK_TIMEOUT_SECONDS = 20

_worker: Worker | None = None
_pipeline = None


async def process_job(job, token=None):
    """Process a single job from BullMQ conversation-queue.

    Expected job.data format (ConversationQueuePayload):
    {
        "conversationId": "uuid",
        "userId": "uuid",
        "messageId": "uuid",
        "content": {
            "contentType": "text" | "multimodal_text",
            "text": "user question"           // for text
            "parts": [...]                    // for multimodal_text
        },
        "mode": "fast" | "reasoning",
        "documents": [
            {"id": "uuid", "url": "...", "name": "...", "mimeType": "..."}
        ]
    }
    """
    global _pipeline
    data = job.data

    conversation_id = data.get("conversationId", "")
    user_id = data.get("userId", "")
    message_id = data.get("messageId", "")

    # ── Extract text from content ──────────────────────────
    content = data.get("content", {})
    content_type = content.get("contentType", "text")

    if content_type == "multimodal_text":
        parts = content.get("parts", [])
        message_text = "\n".join(
            p.get("text", "") for p in parts if p.get("type") == "text"
        ).strip()
    else:
        message_text = content.get("text", "").strip()

    if not message_text:
        logger.warning(
            "Job %s [conv=%s] has empty message, skipping",
            job.id, conversation_id[:8] if conversation_id else "n/a",
        )
        return {"status": "skipped", "reason": "empty message"}

    mode = data.get("mode", "fast")
    log_prefix = f"Job {job.id} [conv={conversation_id[:8] if conversation_id else 'n/a'}, mode={mode}]"

    logger.info(
        "%s processing: user=%s, msg=%r",
        log_prefix,
        user_id[:8] if user_id else "n/a",
        message_text[:80],
    )

    try:
        result = await asyncio.wait_for(
            _run_pipeline(
                job_id=job.id,
                log_prefix=log_prefix,
                conversation_id=conversation_id,
                user_id=user_id,
                message_id=message_id,
                message_text=message_text,
                mode=mode,
                raw_docs=data.get("documents", []),
            ),
            timeout=JOB_TIMEOUT_SECONDS,
        )
        return result

    except asyncio.TimeoutError:
        logger.error("%s timed out after %ds", log_prefix, JOB_TIMEOUT_SECONDS)
        await _post_callback({
            "conversationId": conversation_id,
            "userId": user_id,
            "content": {
                "contentType": "text",
                "text": "⏱️ Sorry, I took too long to respond. Please try a shorter or simpler question.",
            },
        })
        raise

    except Exception as e:
        logger.error("%s failed: %s", log_prefix, str(e), exc_info=True)
        user_msg = _user_friendly_error(e)
        await _safe_post_callback({
            "conversationId": conversation_id,
            "userId": user_id,
            "content": {"contentType": "text", "text": user_msg},
        })
        raise


async def _run_pipeline(
    *,
    job_id: str,
    log_prefix: str,
    conversation_id: str,
    user_id: str,
    message_id: str,
    message_text: str,
    mode: str,
    raw_docs: list[dict],
) -> dict[str, Any]:
    """Core pipeline execution — separated so the timeout wrapper stays clean."""
    # ── Fetch conversation history ─────────────────────────
    history = await get_conversation_history(conversation_id, limit=6)

    # ── Load conversation memory ───────────────────────────
    from src.memory.conversation_memory import ConversationMemory
    memory_mgr = ConversationMemory(llm_client=_pipeline.llm)
    memory_data = await memory_mgr.load(conversation_id)
    memory_context = memory_mgr.build_context(memory_data)

    # ── Parse attached documents ───────────────────────────
    documents = _parse_documents(raw_docs)
    if not documents:
        documents = await _fetch_pg_documents(conversation_id)

    if documents:
        logger.info("%s documents=%d", log_prefix, len(documents))

    # ── Build and run pipeline ─────────────────────────────
    internal_request = ChatRequest(
        request_id=str(uuid.uuid4()),
        user_id=user_id,
        session_id=conversation_id,
        message=message_text,
        conversation_history=history,
        memory_context=memory_context,
        mode=mode,
        documents=documents,
    )

    result = await _pipeline.process(internal_request)
    response_text = result.response.message if result.response else "Processing failed."

    # ── Update memory ──────────────────────────────────────
    await memory_mgr.update(
        conversation_id=conversation_id,
        user_message=message_text,
        ai_response=response_text,
    )

    # ── Build reasoning trace ──────────────────────────────
    reasoning_trace = []
    if result.response and result.response.reasoning_trace:
        reasoning_trace = [
            {
                "step": s.step,
                "thought": s.thought,
                "action": s.action or "",
                "result": s.result or "",
            }
            for s in result.response.reasoning_trace
        ]
        logger.info("%s reasoning_steps=%d", log_prefix, len(reasoning_trace))

    # ── Post callback ──────────────────────────────────────
    callback_payload = {
        "conversationId": conversation_id,
        "userId": user_id,
        "content": {"contentType": "text", "text": response_text},
        "reasoning_trace": reasoning_trace,
    }
    await _post_callback(callback_payload)

    logger.info(
        "%s done: status=%s, memory_turns=%d, reasoning=%d",
        log_prefix,
        result.status,
        memory_data.get("turn_count", 0) + 1,
        len(reasoning_trace),
    )

    return {"status": "completed", "conversationId": conversation_id}


# ── Helpers ────────────────────────────────────────────────────────


def _parse_documents(raw_docs: list[dict]) -> list[DocumentInfo]:
    docs = []
    for d in raw_docs:
        if isinstance(d, dict) and d.get("id") and d.get("url"):
            docs.append(DocumentInfo(
                id=d["id"],
                url=d["url"],
                name=d.get("name", "unknown"),
                mimeType=d.get("mimeType", "text/plain"),
            ))
    return docs


async def _fetch_pg_documents(conversation_id: str) -> list[DocumentInfo]:
    """Fallback: load documents stored in Postgres for this conversation."""
    try:
        from src.db.postgres import get_conversation_documents
        pg_docs = await get_conversation_documents(conversation_id)
        docs = []
        for d in pg_docs:
            if d.get("id") and d.get("url"):
                docs.append(DocumentInfo(
                    id=d["id"],
                    url=d["url"],
                    name=d.get("name", "unknown"),
                    mimeType=d.get("mimeType", "text/plain"),
                ))
        if docs:
            logger.info(
                "Loaded %d documents from Postgres for conv=%s",
                len(docs), conversation_id[:8],
            )
        return docs
    except Exception as e:
        logger.debug("Postgres document lookup skipped: %s", e)
        return []


def _user_friendly_error(exc: Exception) -> str:
    """Map internal exceptions to user-friendly messages without leaking internals."""
    if isinstance(exc, asyncio.TimeoutError):
        return "⏱️ I took too long to respond. Please try again with a simpler question."
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError)):
        return "🌐 I couldn't reach an external service. Please try again in a moment."
    # Generic fallback — do not expose internal details
    return "❌ Something went wrong while processing your request. Please try again."


async def _post_callback(payload: dict[str, Any]) -> None:
    """POST result to BE callback URL with exponential-backoff retry."""
    callback_url = settings.callback_url
    if not callback_url:
        logger.warning("CALLBACK_URL not set — payload logged only")
        logger.debug("Callback payload: %s", payload)
        return

    last_error: Exception | None = None
    for attempt in range(CALLBACK_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=CALLBACK_TIMEOUT_SECONDS) as client:
                resp = await client.post(callback_url, json=payload)
                if resp.status_code < 500:
                    if resp.status_code >= 400:
                        logger.error(
                            "Callback HTTP %d: %s", resp.status_code, resp.text[:300]
                        )
                    else:
                        logger.info("Callback %s → %d", callback_url, resp.status_code)
                    return
                # 5xx — retry
                logger.warning(
                    "Callback server error %d (attempt %d/%d)",
                    resp.status_code, attempt + 1, CALLBACK_MAX_RETRIES,
                )
        except (httpx.TimeoutException, httpx.ConnectError, httpx.RequestError) as e:
            last_error = e
            logger.warning(
                "Callback request error (attempt %d/%d): %s",
                attempt + 1, CALLBACK_MAX_RETRIES, str(e),
            )

        if attempt < CALLBACK_MAX_RETRIES - 1:
            backoff = 2**attempt  # 1s, 2s, 4s
            logger.debug("Retrying callback in %ds...", backoff)
            await asyncio.sleep(backoff)

    logger.error(
        "All %d callback attempts failed for %s: %s",
        CALLBACK_MAX_RETRIES, callback_url, str(last_error),
    )


async def _safe_post_callback(payload: dict[str, Any]) -> None:
    """Best-effort callback — swallows all errors (used in exception handlers)."""
    try:
        await _post_callback(payload)
    except Exception as e:
        logger.error("Error-callback also failed: %s", str(e))


# ── Worker lifecycle ────────────────────────────────────────────────


async def start_worker(pipeline) -> None:
    """Start BullMQ worker listening on conversation-queue."""
    global _worker, _pipeline
    _pipeline = pipeline

    if not settings.enable_bullmq:
        logger.info("BullMQ Worker disabled (running in direct FastAPI mode).")
        return

    import redis.asyncio as aioredis
    try:
        test_client = aioredis.Redis(
            host=settings.bullmq_redis_host,
            port=settings.bullmq_redis_port,
            password=settings.bullmq_redis_password or None,
            socket_connect_timeout=2.0,
        )
        await test_client.ping()
        await test_client.aclose()
    except Exception as e:
        logger.warning(
            "BullMQ Redis at %s:%d unreachable (%s). Worker not started.",
            settings.bullmq_redis_host,
            settings.bullmq_redis_port,
            e,
        )
        return

    redis_opts = {
        "host": settings.bullmq_redis_host,
        "port": settings.bullmq_redis_port,
        "password": settings.bullmq_redis_password or None,
    }

    _worker = Worker(
        QUEUE_NAME,
        process_job,
        {"connection": redis_opts},
    )

    logger.info(
        "BullMQ Worker started: queue=%s, redis=%s:%d, job_timeout=%ds",
        QUEUE_NAME,
        redis_opts["host"],
        redis_opts["port"],
        JOB_TIMEOUT_SECONDS,
    )


async def stop_worker() -> None:
    """Stop BullMQ worker gracefully."""
    global _worker
    if _worker:
        await _worker.close()
        _worker = None
        logger.info("BullMQ Worker stopped")
