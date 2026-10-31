"""Agent Pipeline - orchestrates Guard -> RAG -> (Optional) Verification."""

import logging
import time
from typing import Any

from langfuse import get_client

from src.agents.guard_agent import GuardAgent
from src.agents.hank_persona import HANK_PERSONA_CONTEXT
from src.agents.rag_agent import RAGAgent
from src.agents.sql_agent import SQLAgent
from src.agents.verification_agent import VerificationAgent
from src.cache.semantic_cache import SemanticCache
from src.llm.gemini_client import GeminiClient

from src.schemas.internal import GuardResult
from src.schemas.request import ChatRequest
from src.schemas.response import (
    ChatResponse,
    Citation,
    ReasoningStep,
    ResponseBody,
    ResponseMetadata,
    ResponseStatus,
    RetrievalStats,
    StructuredData,
    TaskClassification,
    TaskType,
    TokenUsage,
    Verification,
    create_clarification_response,
    create_error_response,
)

logger = logging.getLogger(__name__)


class AgentPipeline:
    def __init__(self, rag_engine=None):
        self.llm = GeminiClient()
        # Guard now handles both classification and routing
        self.guard = GuardAgent(self.llm)
        self.rag = RAGAgent(self.llm, rag_engine=rag_engine)
        self.sql_agent = SQLAgent()
        self.verification = VerificationAgent(self.llm)
        self.cache = SemanticCache()

        # User document store (conversation-scoped RAG on uploaded docs)
        self.doc_store = None
        try:
            from src.rag.doc_store import ConversationDocStore
            self.doc_store = ConversationDocStore()
            logger.info("ConversationDocStore initialized")
        except Exception as e:
            logger.warning("DocStore not available: %s", e)

    async def process(self, request: ChatRequest) -> ChatResponse:
        langfuse = get_client()
        with langfuse.start_as_current_observation(
            name="chat-pipeline",
            input=request.message,
        ) as obs:
            obs.update(
                session_id=getattr(request, "session_id", None),
                user_id=getattr(request, "user_id", None),
            )
            response = await self._process_traced(request)

            try:
                obs.update(output=response.model_dump())
            except AttributeError:
                try:
                    obs.update(output=response.dict())
                except AttributeError:
                    obs.update(output=str(response))

            langfuse.flush()
            return response

    async def _process_traced(self, request: ChatRequest) -> ChatResponse:
        start_time = time.time()
        agents_trace = []
        session_id = getattr(request, "session_id", "") or ""

        try:
            # --- 0. Pre-Cache Layer (Instant Response) ---
            pre_cache_embedding = None
            if session_id:
                try:
                    from src.rag.embeddings import embed_texts
                    emb_result = await embed_texts([request.message])
                    pre_cache_embedding = emb_result[0]
                except Exception as e:
                    logger.debug("Pre-cache embedding skipped: %s", e)

                cached = await self.cache.session_lookup(
                    session_id, request.message, embedding=pre_cache_embedding,
                )
                if cached:
                    elapsed_ms = int((time.time() - start_time) * 1000)
                    logger.info("⚡ PRE-CACHE HIT: session=%s, query=%s", session_id[:8], request.message[:40])
                    # Update metadata so users see it was pre-cache
                    if "metadata" in cached:
                        cached["metadata"]["agents_trace"] = ["pre_cache"]
                    return self._build_cached_response(
                        request.request_id, cached, elapsed_ms,
                    )

            # 0.5. Ingest user documents (if any new ones in request)
            has_user_docs = False
            if self.doc_store and session_id and request.documents:
                try:
                    doc_dicts = [
                        {"id": d.id, "url": d.url, "name": d.name}
                        for d in request.documents
                    ]
                    new_chunks = await self.doc_store.ingest_documents(
                        session_id, doc_dicts,
                    )
                    if new_chunks > 0:
                        logger.info(
                            "Ingested %d new chunks from %d docs for conversation=%s",
                            new_chunks, len(request.documents), session_id[:8],
                        )
                        agents_trace.append("doc_ingest")
                except Exception as e:
                    logger.error("Document ingestion failed: %s", e)

            # Check if conversation already has indexed documents
            if self.doc_store and session_id:
                try:
                    has_user_docs = await self.doc_store.has_documents(session_id)
                except Exception:
                    pass

            # 1. Guard Agent (Classification, Cleanup, Routing - merged)
            guard_result = await self.guard.run({
                "raw_message": request.message,
                "memory_context": request.memory_context
            })
            agents_trace.append("guard_router")

            # Skip clarification if conversation has user docs
            # (user clearly wants to ask about uploaded documents)
            if guard_result.requires_clarification and not has_user_docs:
                return create_clarification_response(
                    request_id=request.request_id,
                    message=guard_result.clarification_message,
                    suggestions=[],
                    classification=self._to_classification(guard_result),
                )

            if not guard_result.is_valid:
                return create_error_response(
                    request_id=request.request_id,
                    code="INVALID_INPUT",
                    message="Input khong hop le. Vui long thu lai.",
                )

            # 2. Fast-track Direct Responses (casual chat)
            # Keep true casual chat on the direct branch, but send out-of-domain
            # questions such as "React là gì?" through the general-knowledge
            # responder so they receive a real answer instead of the logistics intro.
            if guard_result.route_to == "direct" and (
                guard_result.is_in_domain or guard_result.task_type == "general_chat"
            ):
                return await self._handle_direct(request, guard_result, agents_trace, start_time)

            # 3. Compute embedding for semantic cache (Gemini embeddings)
            query_embedding = None
            try:
                from src.rag.embeddings import embed_texts
                emb_result = await embed_texts([guard_result.cleaned_prompt])
                query_embedding = emb_result[0]
            except Exception as e:
                logger.debug("Embedding computation skipped: %s", e)

            # 4. Session Semantic Cache Lookup (2-layer: exact MD5 + cosine similarity)
            if session_id:
                cached = await self.cache.session_lookup(
                    session_id, guard_result.cleaned_prompt, embedding=query_embedding,
                )
                if cached:
                    elapsed_ms = int((time.time() - start_time) * 1000)
                    logger.info("Session cache HIT: session=%s, query=%s", session_id[:8], guard_result.cleaned_prompt[:40])
                    return self._build_cached_response(
                        request.request_id, cached, elapsed_ms,
                    )

            # 5. RAG Agent (with optional user doc context)
            # Check if conversation has user-uploaded documents
            user_doc_chunks = []
            if self.doc_store and session_id and query_embedding is not None:
                try:
                    has_docs = await self.doc_store.has_documents(session_id)
                    if has_docs:
                        user_doc_chunks = await self.doc_store.search(
                            session_id, query_embedding, top_k=5,
                        )
                        if user_doc_chunks:
                            logger.info(
                                "Found %d user doc chunks for conversation=%s",
                                len(user_doc_chunks), session_id[:8],
                            )
                except Exception as e:
                    logger.warning("User doc search failed: %s", e)

            # 5. Execution based on Route
            if guard_result.route_to == "sql":
                sql_result = await self.sql_agent.run(request.message, guard_result)
                agents_trace.append("sql")
                elapsed_ms = int((time.time() - start_time) * 1000)
                
                # Check verification if we want? Usually SQL is deterministic but let's bypass verification for raw Data.
                verification_data = Verification(
                    confidence_score=1.0, groundedness_score=1.0, is_verified=True,
                    hallucination_flags=[], disclaimer=""
                )
                
                return ChatResponse(
                    request_id=request.request_id,
                    status=ResponseStatus.SUCCESS,
                    task_classification=self._to_classification(guard_result),
                    response=ResponseBody(
                        message=sql_result.response_text,
                        structured_data=StructuredData()
                    ),
                    verification=verification_data,
                    metadata=ResponseMetadata(
                        model_used=sql_result.model_used,
                        processing_time_ms=elapsed_ms,
                        agents_trace=agents_trace,
                        knowledge_source="sql_db"
                    )
                )

            # RAG or HYBRID Fallthrough
            execution_plan = guard_result
            rag_result = await self.rag.run({
                "guard_result": guard_result,
                "execution_plan": execution_plan,
                "conversation_history": request.conversation_history,
                "memory_context": request.memory_context,
                "mode": request.mode,
                "user_doc_chunks": user_doc_chunks,
            })
            agents_trace.append("rag")
            
            if guard_result.route_to == "hybrid":
                # Run SQL + RAG -> merge them!
                sql_result = await self.sql_agent.run(request.message, guard_result)
                agents_trace.append("sql_hybrid")
                
                merge_prompt = (
                    f"Bạn là AI thông minh tổng hợp dữ liệu. Trả lời người dùng: '{request.message}'.\n"
                    f"1. Dữ liệu từ Database: {sql_result.response_text}\n"
                    f"2. Luật lệ từ Chính sách: {rag_result.response_text}\n"
                    "Hãy viết 1 câu trả lời trọn vẹn, giải quyết triệt để câu hỏi của user dựa vào 2 nguồn trên. KHÔNG BỊA RA THÔNG TIN."
                )
                hybrid_ans = await self.llm.fast_chat([{"role": "user", "content": merge_prompt}])
                rag_result.response_text = hybrid_ans["content"]
                rag_result.model_used += f" + {sql_result.model_used} (Hybrid)"


            # 5. Verification Agent (Optional)
            # Skip if fast mode, or general knowledge, or query is simple
            skip_verification = (
                request.mode == "fast" or
                not guard_result.is_in_domain or guard_result.estimated_complexity == "low"
            )

            if skip_verification:
                logger.info("Skipping verification agent (out-of-domain or low complexity)")
                verification_citations = [
                    Citation(
                        source_id=c.get("source", ""),
                        source_name=c.get("source", ""),
                        chunk_text=c.get("text", ""),
                        relevance_score=c.get("score", 0.0),
                    )
                    for c in rag_result.retrieved_chunks
                ]

                verification_data = Verification(
                    confidence_score=1.0,
                    groundedness_score=1.0,
                    is_verified=True,
                    hallucination_flags=[],
                    disclaimer="",
                )
            else:
                verification_result = await self.verification.run(rag_result)
                agents_trace.append("verification")
                verification_citations = [
                    Citation(
                        source_id=c.get("source_id", ""),
                        source_name=c.get("source_name", ""),
                        chunk_text=c.get("chunk_text", ""),
                        relevance_score=c.get("relevance_score", 0.0),
                    )
                    for c in verification_result.citations
                ]
                verification_data = Verification(
                    confidence_score=verification_result.confidence_score,
                    groundedness_score=verification_result.groundedness_score,
                    is_verified=verification_result.is_verified,
                    hallucination_flags=verification_result.hallucination_flags,
                    disclaimer=verification_result.disclaimer,
                )

                # Use verified response if available
                rag_result.response_text = verification_result.verified_response

            elapsed_ms = int((time.time() - start_time) * 1000)

            reasoning_trace = [ReasoningStep(**step) for step in rag_result.reasoning_steps]

            response = ChatResponse(
                request_id=request.request_id,
                status=ResponseStatus.SUCCESS,
                task_classification=self._to_classification(guard_result),
                response=ResponseBody(
                    message=rag_result.response_text,
                    reasoning_trace=reasoning_trace,
                    structured_data=StructuredData(**rag_result.structured_output)
                    if rag_result.structured_output
                    else StructuredData(),
                ),
                citations=verification_citations,
                verification=verification_data,
                metadata=ResponseMetadata(
                    model_used=rag_result.model_used,
                    processing_time_ms=elapsed_ms,
                    tokens_used=TokenUsage(**rag_result.token_usage)
                    if rag_result.token_usage
                    else TokenUsage(),
                    retrieval_stats=RetrievalStats(
                        documents_retrieved=len(rag_result.retrieved_chunks),
                    ),
                    agents_trace=agents_trace,
                    knowledge_source=rag_result.knowledge_source,
                ),
            )

            # 7. Store in Session Semantic Cache (scoped to this conversation)
            # Skip caching if: response used general_knowledge for a doc-dependent task.
            # These responses may change once user uploads documents, so caching them
            # would cause stale "I don't have your document" replies later.
            _doc_dependent_tasks = {"summarize", "analyze", "extract", "compare", "translate"}
            _is_doc_dependent_miss = (
                rag_result.knowledge_source == "general_knowledge"
                and str(guard_result.task_type).lower() in _doc_dependent_tasks
                and len(rag_result.retrieved_chunks) == 0
            )
            if session_id and verification_data.is_verified and not _is_doc_dependent_miss:
                await self.cache.session_store(
                    session_id=session_id,
                    query=request.message,
                    response=response.model_dump(),
                    embedding=pre_cache_embedding,
                )
            elif _is_doc_dependent_miss:
                logger.debug(
                    "Skipping cache for doc-dependent miss (task=%s, source=general_knowledge)",
                    guard_result.task_type,
                )

            return response

        except Exception as e:
            logger.error("Pipeline failed for request %s: %s", request.request_id, str(e))
            return create_error_response(
                request_id=request.request_id,
                code="INTERNAL_ERROR",
                message=f"Internal processing error: {str(e)}",
            )

    async def _handle_direct(
        self,
        request: ChatRequest,
        guard_result: GuardResult,
        agents_trace: list[str],
        start_time: float,
    ) -> ChatResponse:
        # Use direct response generated by Orchestrator to save an LLM call
        if getattr(guard_result, 'direct_response', None):
            response_text = guard_result.direct_response
            model_used = "guard_orchestrator"
            agents_trace.append("direct")
        else:
            system_content = HANK_PERSONA_CONTEXT + "\n\nRespond naturally and briefly to the user's request."
            if request.memory_context:
                system_content += "\n\n" + request.memory_context

            messages = [
                {"role": "system", "content": system_content},
            ]

            # Inject conversation history
            if request.conversation_history:
                for h in request.conversation_history[-4:]:
                    messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

            messages.append({"role": "user", "content": request.message})

            response = await self.llm.fast_chat(messages=messages, temperature=0.7)
            agents_trace.append("direct")
            response_text = response["content"]
            model_used = response.get("model", "")
        elapsed_ms = int((time.time() - start_time) * 1000)

        return ChatResponse(
            request_id=request.request_id,
            status=ResponseStatus.SUCCESS,
            task_classification=self._to_classification(guard_result),
            response=ResponseBody(message=response_text),
            metadata=ResponseMetadata(
                model_used=model_used,
                processing_time_ms=elapsed_ms,
                agents_trace=agents_trace,
            ),
        )

    def _build_cached_response(
        self,
        request_id: str,
        cached: dict,
        elapsed_ms: int,
    ) -> ChatResponse:
        """Reconstruct ChatResponse from cached dict.

        Overrides: request_id, processing_time_ms, cache_hit=True.
        Preserves: everything else from the original response.
        """
        cached["request_id"] = request_id
        if "metadata" in cached:
            cached["metadata"]["processing_time_ms"] = elapsed_ms
            cached["metadata"]["cache_hit"] = True
            cached["metadata"]["agents_trace"] = ["cache"]
        # Handle datetime serialization
        if "timestamp" in cached:
            del cached["timestamp"]
        try:
            return ChatResponse(**cached)
        except Exception as e:
            logger.warning("Cache reconstruction failed: %s", e)
            # Fallback: return minimal valid response
            return ChatResponse(
                request_id=request_id,
                status=ResponseStatus.SUCCESS,
                response=ResponseBody(
                    message=cached.get("response", {}).get("message", ""),
                ),
                metadata=ResponseMetadata(
                    processing_time_ms=elapsed_ms,
                    cache_hit=True,
                    agents_trace=["cache"],
                ),
            )

    @staticmethod
    def _to_classification(guard_result: GuardResult) -> TaskClassification:
        try:
            task_type = TaskType(guard_result.task_type)
        except ValueError:
            task_type = TaskType.GENERAL_CHAT

        sub_types = []
        for st in guard_result.sub_types:
            try:
                sub_types.append(TaskType(st))
            except ValueError:
                continue

        return TaskClassification(
            task_type=task_type,
            sub_types=sub_types,
            confidence=guard_result.confidence,
        )
