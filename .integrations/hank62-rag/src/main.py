"""HKT AI Service - FastAPI Application.

Multi-agent pipeline: Guard -> Router -> RAG -> Verification.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.agents.pipeline import AgentPipeline
from src.cache.redis_client import close_redis, init_redis
from src.config import settings
from src.db.postgres import close_pool as close_db_pool
from src.db.postgres import init_pool as init_db_pool
from src.rag.engine import RAGEngine
from src.schemas.request import ChatRequest, ConversationChatRequest, IngestRequest, DashboardAnalysisRequest
from src.security import require_ticket
from src.schemas.response import ChatResponse, create_error_response, DashboardAnalysisResponse
from src.utils.logger import setup_logging
from src.workers.chat_worker import start_worker, stop_worker

# the documents the upload route takes (the workspace offers the same list)
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".json"}

rag_engine: RAGEngine | None = None
pipeline: AgentPipeline | None = None
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_engine, pipeline

    setup_logging()
    logger.info("Starting HKT AI Service [v1.4.0 - Gemini Full Stack]...")
    logger.info("Main model: %s", settings.gemini_model)
    logger.info("Fast model: %s", settings.gemini_fast_model)
    logger.info("Embedding: %s", settings.embedding_model)
    logger.info("Groq models suppressed by user directive.")
    if settings.rag_token_secret:
        logger.info("Requests need a ticket from the realtime server (RAG_TOKEN_SECRET is set).")
    else:
        logger.warning("RAG_TOKEN_SECRET is not set: anyone who can reach this address can use the service. Set it here and on the realtime server.")

    # Init Postgres pool (shared DB with BE)
    await init_db_pool()

    # Init Redis (cache + memory)
    await init_redis()

    rag_engine = RAGEngine()
    try:
        await rag_engine.initialize()
        logger.info("RAG Engine initialized")
        # Ingest in the background: embedding + LLM extraction of every policy chunk can take
        # minutes, and blocking startup here would fail the hosting platform's health check.
        ingest_task = asyncio.create_task(_auto_ingest_if_empty(rag_engine))
        ingest_task.add_done_callback(_log_ingest_result)
    except Exception as e:
        logger.warning("RAG Engine not initialized: %s (will work without RAG)", str(e))
        rag_engine = None

    pipeline = AgentPipeline(rag_engine=rag_engine)
    logger.info("Agent Pipeline ready")

    if settings.callback_url:
        logger.info("Callback URL: %s", settings.callback_url)
    else:
        logger.warning("CALLBACK_URL not set - async responses will be logged only")

    # Start BullMQ worker (consumes jobs from BE queue)
    await start_worker(pipeline)

    logger.info("HKT AI Service [v1.4.0] is running on %s:%d", settings.host, settings.port)

    yield

    await stop_worker()
    await close_redis()
    await close_db_pool()
    logger.info("Shutting down HKT AI Service...")


def _log_ingest_result(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception():
        logger.error("Auto-ingest failed: %s", task.exception())


async def _auto_ingest_if_empty(engine: RAGEngine):
    """Auto-ingest documents from data/extracted/policy_chunks.json if Qdrant collections are empty.
    This file is tracked by git, ensuring all Prod environments load the exact same policies.
    """
    import json
    json_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "extracted", "policy_chunks.json")

    if not os.path.exists(json_file):
        logger.info("policies_chunks.json not found, skipping auto-ingest")
        return

    try:
        import httpx
        resp = httpx.get(
            f"{settings.qdrant_endpoint}/collections/lightrag_vdb_chunks",
            headers={"api-key": settings.qdrant_api_key} if settings.qdrant_api_key else {},
            timeout=10,
        )
        points_count = resp.json().get("result", {}).get("points_count", 0)
    except Exception:
        points_count = 0

    if points_count > 0:
        logger.info("Qdrant already has %d vectors, skipping auto-ingest", points_count)
        return

    logger.info("Qdrant is empty. Auto-ingesting from policy_chunks.json...")
    documents = []
    with open(json_file, "r", encoding="utf-8") as fh:
        chunks = json.load(fh)
        for c in chunks:
            if "text" in c:
                documents.append(c["text"])

    logger.info("Ingesting %d chunks...", len(documents))
    result = await engine.ingest(documents)
    logger.info("Auto-ingest complete: %s", result)



app = FastAPI(
    title="HKT AI Service",
    description="Domain-Specific Agentic RAG System with Multi-Agent Pipeline",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
app.mount("/ui", StaticFiles(directory=str(frontend_dist), check_dir=False), name="workspace")


@app.get("/health")
async def health_check():
    # for anyone, an uptime monitor included: nothing about how the service is set up
    return {
        "status": "healthy",
        "rag_initialized": rag_engine.is_initialized if rag_engine else False,
    }


@app.post("/api/chat", response_model=ChatResponse, dependencies=[Depends(require_ticket)])
async def chat(request: ChatRequest):
    """Synchronous chat endpoint - waits for full pipeline result."""
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")

    logger.info("Request %s from user %s, mode: %s", request.request_id, request.user_id, request.mode)

    # Load conversation memory if session_id provided
    from src.memory.conversation_memory import ConversationMemory
    memory_mgr = ConversationMemory(llm_client=pipeline.llm)
    if request.session_id:
        memory_data = await memory_mgr.load(request.session_id)
        request.memory_context = memory_mgr.build_context(memory_data)

    response = await pipeline.process(request)

    # Update memory after response
    if request.session_id and response.response:
        await memory_mgr.update(
            conversation_id=request.session_id,
            user_message=request.message,
            ai_response=response.response.message,
        )

    logger.info(
        "Response %s - status=%s, time=%dms",
        request.request_id,
        response.status,
        response.metadata.processing_time_ms,
    )
    return response


@app.post("/api/chat/async", status_code=202, dependencies=[Depends(require_ticket)])
async def chat_async(request: ConversationChatRequest, background_tasks: BackgroundTasks):
    """Async chat endpoint - returns 202 immediately, processes in background.

    Result is POSTed to CALLBACK_URL when ready.
    """
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")

    message_text = request.extract_text()
    if not message_text:
        raise HTTPException(status_code=400, detail="Empty message content")

    logger.info(
        "Async request: conversation=%s, user=%s, message=%s",
        request.conversationId[:8],
        request.userId[:8],
        message_text[:50],
    )

    background_tasks.add_task(
        process_chat_async,
        pipeline=pipeline,
        conversation_id=request.conversationId,
        user_id=request.userId,
        message_text=message_text,
    )

    return {
        "status": "processing",
        "conversationId": request.conversationId,
        "message": "Request accepted. Result will be posted to callback URL.",
    }


@app.post("/api/dashboard/analyze", response_model=DashboardAnalysisResponse, dependencies=[Depends(require_ticket)])
async def dashboard_analyze(request: DashboardAnalysisRequest):
    """Direct analysis endpoint for the dashboard, bypassing generic agents."""
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")

    prompt = f"""Bạn là Chuyên gia phân tích rủi ro vận hành (Operations Risk Analyst).
Hãy phân tích các số liệu sau:

[Tổng quan kho]
{request.overview_stats}

[Trending 7 ngày]
{request.trend_last_7_days}

[Top Đối Tác]
{request.top_carriers}

[Top Tỉnh Thành]
{request.top_provinces}

Yêu cầu:
1. Tóm tắt nhanh rủi ro vận hành lớn nhất.
2. Đề xuất action ngắn gọn, đúng trọng tâm nhất để giải quyết (tối đa 3 gạch đầu dòng).
Lưu ý: Không giải thích lề mề, đi thẳng vào vấn đề. Format Markdown."""

    logger.info("Executing dashboard analysis fast_chat")
    try:
        # Use fast chat model for quick response
        result = await pipeline.llm.fast_chat(
            messages=[{"role": "user", "content": prompt}]
        )
        message = result.get("content", "")
        return DashboardAnalysisResponse(message=message)
    except Exception as e:
        logger.error("Dashboard analysis failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to analyze dashboard data")


@app.post("/api/ingest", dependencies=[Depends(require_ticket)])
async def ingest_documents(request: IngestRequest):
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG Engine not initialized")

    logger.info("Ingesting %d documents...", len(request.documents))
    result = await rag_engine.ingest(request.documents)
    logger.info("Ingestion complete: %s", result)
    return result


@app.get("/api/stats", dependencies=[Depends(require_ticket)])
async def get_stats():
    stats = {
        "rag_initialized": rag_engine.is_initialized if rag_engine else False,
    }
    if pipeline:
        stats["key_stats"] = pipeline.llm.get_key_stats()
        stats["cache_stats"] = await pipeline.cache.stats()
    return stats


# ── Test endpoints (demo only, bypasses BE) ─────────────────────

@app.post("/api/test/upload", dependencies=[Depends(require_ticket)])
async def test_upload_document(
    file: UploadFile = File(...),
    conversation_id: str = Form(default=""),
):
    """Upload a document directly for testing (bypasses BE/URL download).

    Processes the file inline: parse → chunk → embed → store in Qdrant.
    Returns the conversation_id to use for subsequent chat requests.
    """
    if not pipeline or not pipeline.doc_store:
        raise HTTPException(status_code=503, detail="DocStore not initialized")

    import uuid as uuid_lib

    if not conversation_id:
        conversation_id = str(uuid_lib.uuid4())

    filename = file.filename or "unknown.txt"
    if os.path.splitext(filename)[1].lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=415, detail="That kind of file cannot be added. Use PDF, DOCX, TXT, MD, CSV or JSON.")

    # Read at most one byte over the limit, so a huge file is refused without being held in memory
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="That file is too large.")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    doc_id = str(uuid_lib.uuid4())

    logger.info(
        "Test upload: file=%s, size=%dKB, conversation=%s",
        filename, len(content) // 1024, conversation_id[:8],
    )

    try:
        from src.rag.doc_parser import extract_text
        from src.rag.doc_chunker import chunk_text
        from src.rag.embeddings import embed_texts

        # Parse → Chunk → Embed → Upsert (inline, no URL download)
        text = extract_text(content, filename)
        if not text or len(text.strip()) < 10:
            raise HTTPException(status_code=400, detail="No extractable text in file")

        chunks = chunk_text(
            text,
            chunk_size=settings.user_docs_chunk_size,
            overlap=settings.user_docs_chunk_overlap,
        )
        if not chunks:
            raise HTTPException(status_code=400, detail="File produced no chunks")

        embeddings = await embed_texts(chunks)

        await pipeline.doc_store.ensure_collection()
        await pipeline.doc_store._upsert_chunks(
            conversation_id=conversation_id,
            doc_id=doc_id,
            doc_name=filename,
            chunks=chunks,
            embeddings=embeddings,
        )
        await pipeline.doc_store._mark_chunked(doc_id, len(chunks))

        logger.info(
            "Test upload complete: %s → %d chunks, conversation=%s",
            filename, len(chunks), conversation_id[:8],
        )

        return {
            "status": "success",
            "conversation_id": conversation_id,
            "document_id": doc_id,
            "filename": filename,
            "chunks_created": len(chunks),
            "text_length": len(text),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Test upload failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/api/docs/{scope}", dependencies=[Depends(require_ticket)])
async def list_documents(scope: str):
    """The documents indexed under a scope. The vault uses the shared library scope, which every chat reads."""
    if not pipeline or not pipeline.doc_store:
        raise HTTPException(status_code=503, detail="DocStore not initialized")
    return {"scope": scope, "documents": await pipeline.doc_store.list_documents(scope)}


@app.delete("/api/docs/{scope}/{doc_id}", dependencies=[Depends(require_ticket)])
async def delete_document(scope: str, doc_id: str):
    """Remove one document from a scope."""
    if not pipeline or not pipeline.doc_store:
        raise HTTPException(status_code=503, detail="DocStore not initialized")
    return {"deleted_chunks": await pipeline.doc_store.delete_document(scope, doc_id)}


@app.get("/api/test/docs/{conversation_id}", dependencies=[Depends(require_ticket)])
async def test_list_documents(conversation_id: str):
    """List indexed documents for a conversation (demo testing)."""
    if not pipeline or not pipeline.doc_store:
        raise HTTPException(status_code=503, detail="DocStore not initialized")

    has_docs = await pipeline.doc_store.has_documents(conversation_id)
    return {
        "conversation_id": conversation_id,
        "has_documents": has_docs,
    }


@app.get("/demo")
async def demo_page():
    html_path = frontend_dist / "index.html"
    if not html_path.is_file():
        html_path = Path(__file__).resolve().parent / "static" / "demo.html"
    return FileResponse(html_path, media_type="text/html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        reload=settings.debug,
    )
