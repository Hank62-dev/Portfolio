"""Hank answers any topic: from its own knowledge, from the user's documents, and from the web."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest
from google.genai import types

from src.agents.guard_agent import GuardAgent, normalize_route
from src.agents.pipeline import AgentPipeline
from src.agents.rag_agent import RAGAgent
from src.config import settings
from src.llm.gemini_client import GeminiClient
from src.schemas.internal import GuardResult, RAGResult
from src.schemas.request import ChatRequest


def guard(**overrides) -> GuardResult:
    base = dict(
        is_valid=True,
        task_type="query",
        cleaned_prompt="What is the capital of France?",
        route_to="general",
        is_in_domain=False,
        detected_language="en",
    )
    base.update(overrides)
    return GuardResult(**base)


class FakeLLM:
    """Records every call and answers with a canned reply (optionally with web sources)."""

    def __init__(self, content="An answer.", sources=None, fail_on_web=False):
        self.calls = []
        self.content = content
        self.sources = sources or []
        self.fail_on_web = fail_on_web

    async def _reply(self, messages, web_search=False, **kwargs):
        self.calls.append({"messages": messages, "web_search": web_search, **kwargs})
        if web_search and self.fail_on_web:
            raise RuntimeError("search quota")
        return {"content": self.content, "sources": self.sources if web_search else [], "model": "fake", "usage": {}}

    async def chat(self, messages, **kwargs):
        return await self._reply(messages, **kwargs)

    async def fast_chat(self, messages, **kwargs):
        return await self._reply(messages, **kwargs)


def run_agent(agent, **overrides):
    data = dict(guard_result=guard(), execution_plan=guard(), conversation_history=[], memory_context="", mode="fast", user_doc_chunks=[], use_web=False)
    data.update(overrides)
    return agent.execute(data)


def prompt_of(llm, index=-1) -> str:
    return "\n".join(m["content"] for m in llm.calls[index]["messages"])


# ── routing ─────────────────────────────────────────────────────────


def test_unknown_routes_become_a_normal_answer_never_a_refusal():
    assert [normalize_route(r) for r in ["web", "GENERAL", "rag", "sql", "hybrid", "direct"]] == ["web", "general", "rag", "sql", "hybrid", "direct"]
    assert normalize_route("refuse") == "general"
    assert normalize_route(None) == "general"


async def test_the_guard_keeps_an_off_topic_question_and_flags_web_needs():
    llm = SimpleNamespace(fast_chat=AsyncMock(return_value={"content": json.dumps({"is_valid": True, "task_type": "query", "route_to": "web", "is_in_domain": False, "cleaned_prompt": "latest React version", "detected_language": "en"})}))
    result = await GuardAgent(llm).execute({"raw_message": "what is the latest React version", "memory_context": ""})
    assert (result.route_to, result.is_in_domain, result.needs_web) == ("web", False, True)


async def test_the_guard_still_answers_when_its_own_reply_cannot_be_read():
    llm = SimpleNamespace(fast_chat=AsyncMock(return_value={"content": "not json at all"}))
    result = await GuardAgent(llm).execute({"raw_message": "explain recursion", "memory_context": ""})
    assert result.route_to == "general"
    assert result.cleaned_prompt == "explain recursion"
    assert not result.direct_response


# ── answering ───────────────────────────────────────────────────────


async def test_a_question_outside_logistics_is_answered_from_knowledge():
    llm = FakeLLM("Paris.")
    result = await run_agent(RAGAgent(llm))
    assert result.response_text == "Paris."
    assert result.knowledge_source == "general_knowledge"
    assert llm.calls[0]["web_search"] is False
    system = llm.calls[0]["messages"][0]["content"]
    assert "MỌI chủ đề" in system  # the prompt tells the model it answers every topic
    assert "logistics" not in system.lower().replace("không chỉ logistics", "")


async def test_documents_are_used_and_cited_when_the_question_is_about_them():
    llm = FakeLLM("It says 12 days.")
    chunks = [{"text": "Employees get 12 days of leave per year.", "source": "policy.pdf", "score": 0.82}]
    result = await run_agent(RAGAgent(llm), guard_result=guard(route_to="rag"), user_doc_chunks=chunks)
    assert result.knowledge_source == "rag"
    assert result.retrieved_chunks == chunks
    assert "12 days of leave" in prompt_of(llm)


async def test_documents_that_do_not_bear_on_the_question_are_offered_but_not_credited():
    llm = FakeLLM("Paris.")
    chunks = [{"text": "Warehouse intake procedure, section 4.", "source": "sop.pdf", "score": 0.3}]
    result = await run_agent(RAGAgent(llm), guard_result=guard(route_to="general"), user_doc_chunks=chunks)
    assert result.knowledge_source == "general_knowledge"
    assert result.retrieved_chunks == []
    assert "only if they bear on the question" in prompt_of(llm)


async def test_empty_or_placeholder_chunks_are_ignored():
    llm = FakeLLM()
    await run_agent(RAGAgent(llm), user_doc_chunks=[{"text": "none"}, {"text": ""}, {"text": "too short"}])
    assert "(None matched, or none were added.)" in prompt_of(llm)


async def test_web_search_is_used_and_its_pages_are_returned():
    pages = [{"title": "react.dev", "url": "https://example.com/r"}]
    llm = FakeLLM("React 19.", sources=pages)
    result = await run_agent(RAGAgent(llm), guard_result=guard(route_to="web", needs_web=True), use_web=True)
    assert llm.calls[0]["web_search"] is True
    assert result.knowledge_source == "web"
    assert result.web_sources == pages


async def test_if_the_model_does_not_actually_search_the_answer_is_not_called_web():
    llm = FakeLLM("Paris.", sources=[])
    result = await run_agent(RAGAgent(llm), use_web=True)
    assert result.knowledge_source == "general_knowledge"


async def test_a_failed_web_search_still_gets_an_answer_and_says_so():
    llm = FakeLLM("From what I know: Paris.", fail_on_web=True)
    result = await run_agent(RAGAgent(llm), use_web=True)
    assert [c["web_search"] for c in llm.calls] == [True, False]
    assert "Searching the web failed" in prompt_of(llm)
    assert result.response_text == "From what I know: Paris."
    assert result.knowledge_source == "general_knowledge"


async def test_reasoning_mode_asks_for_a_short_thinking_block_and_strips_it():
    llm = FakeLLM("<thinking>\nStep 1 - INTENT: capital\n</thinking>\nParis.")
    result = await run_agent(RAGAgent(llm), mode="reasoning")
    assert result.response_text == "Paris."
    assert result.reasoning_steps
    assert "<thinking>" in llm.calls[0]["messages"][0]["content"]


# ── the Gemini client ───────────────────────────────────────────────


def gemini_response(text="Hello", chunks=None):
    candidate = {"content": {"parts": [{"text": text}]}, "finish_reason": "STOP"}
    if chunks is not None:
        candidate["grounding_metadata"] = {"grounding_chunks": chunks}
    return types.GenerateContentResponse(candidates=[candidate], usage_metadata={"prompt_token_count": 1, "candidates_token_count": 1, "total_token_count": 2})


@pytest.fixture
def gemini(monkeypatch):
    holder = {}

    def make(response):
        generate = AsyncMock(return_value=response)
        client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
        monkeypatch.setattr("src.llm.gemini_client._get_client", lambda: client)
        holder["generate"] = generate
        return GeminiClient(), generate

    return make


async def test_web_search_turns_on_google_search_and_reads_the_pages_back(gemini):
    client, generate = gemini(
        gemini_response("React 19", chunks=[{"web": {"uri": "https://a.test/1", "title": "A"}}, {"web": {"uri": "https://a.test/1", "title": "A again"}}, {"web": {"uri": "https://b.test/2", "title": "B"}}])
    )
    result = await client.chat([{"role": "user", "content": "latest react"}], web_search=True)
    assert generate.call_args.kwargs["config"]["tools"] == [{"google_search": {}}]
    assert result["sources"] == [{"title": "A", "url": "https://a.test/1"}, {"title": "B", "url": "https://b.test/2"}]


async def test_without_web_search_there_is_no_tool_and_no_sources(gemini):
    client, generate = gemini(gemini_response("Hi"))
    result = await client.chat([{"role": "user", "content": "hi"}])
    assert "tools" not in generate.call_args.kwargs["config"]
    assert result["sources"] == []


async def test_json_mode_is_dropped_when_searching_the_web(gemini):
    client, generate = gemini(gemini_response("{}"))
    await client.chat([{"role": "user", "content": "x"}], json_mode=True, web_search=True)
    assert "response_mime_type" not in generate.call_args.kwargs["config"]


# ── the pipeline ────────────────────────────────────────────────────


def request(message="What is the capital of France?", web="auto", session="chat-1"):
    return ChatRequest(request_id="r1", user_id="u", session_id=session, message=message, mode="fast", web_search=web)


def build_pipeline(monkeypatch, guard_result, rag_result=None, docs=None):
    """A pipeline whose parts are fakes, so only its own decisions are tested."""
    docs = docs or {}
    pipeline = object.__new__(AgentPipeline)
    pipeline.llm = FakeLLM("small talk")
    pipeline.guard = SimpleNamespace(run=AsyncMock(return_value=guard_result))
    pipeline.rag = SimpleNamespace(run=AsyncMock(return_value=rag_result or RAGResult(response_text="Paris.", knowledge_source="general_knowledge")))
    pipeline.sql_agent = SimpleNamespace(run=AsyncMock())
    pipeline.verification = SimpleNamespace(run=AsyncMock())
    pipeline.cache = SimpleNamespace(session_lookup=AsyncMock(return_value=None), session_store=AsyncMock())
    pipeline.doc_store = SimpleNamespace(
        has_documents=AsyncMock(side_effect=lambda scope: scope in docs),
        search=AsyncMock(side_effect=lambda scope, emb, top_k=5: docs.get(scope, [])),
        ingest_documents=AsyncMock(return_value=0),
    )
    monkeypatch.setattr("src.rag.embeddings.embed_texts", AsyncMock(return_value=np.array([[0.1, 0.2]])))
    return pipeline


async def test_an_off_topic_question_is_answered_not_sent_to_the_direct_branch(monkeypatch):
    pipeline = build_pipeline(monkeypatch, guard(route_to="general", is_in_domain=False))
    response = await pipeline._process_traced(request())
    assert response.status.value == "success"
    assert response.response.message == "Paris."
    assert "rag" in response.metadata.agents_trace
    assert "direct" not in response.metadata.agents_trace
    pipeline.rag.run.assert_awaited_once()


async def test_only_small_talk_takes_the_direct_branch(monkeypatch):
    pipeline = build_pipeline(monkeypatch, guard(route_to="direct", task_type="general_chat", direct_response="Hi Huy!"))
    response = await pipeline._process_traced(request("hello"))
    assert response.response.message == "Hi Huy!"
    pipeline.rag.run.assert_not_awaited()


async def test_every_chat_reads_the_shared_library_as_well_as_its_own_documents(monkeypatch):
    own = [{"text": "from this chat " * 5, "score": 0.5}]
    library = [{"text": "from the vault " * 5, "score": 0.9}]
    pipeline = build_pipeline(monkeypatch, guard(route_to="rag"), docs={"chat-1": own, settings.library_scope: library})
    await pipeline._process_traced(request("summarise my document"))
    given = pipeline.rag.run.await_args.args[0]["user_doc_chunks"]
    assert [c["score"] for c in given] == [0.9, 0.5]  # best first, from both scopes


async def test_the_library_is_read_even_in_a_chat_with_no_documents_of_its_own(monkeypatch):
    library = [{"text": "from the vault " * 5, "score": 0.9}]
    pipeline = build_pipeline(monkeypatch, guard(route_to="rag"), docs={settings.library_scope: library})
    await pipeline._process_traced(request("what does my file say"))
    assert pipeline.rag.run.await_args.args[0]["user_doc_chunks"] == library


@pytest.mark.parametrize(
    ("route", "needs_web", "choice", "expected"),
    [
        ("web", False, "auto", True),
        ("general", True, "auto", True),
        ("general", False, "auto", False),
        ("general", False, "on", True),
        ("web", True, "off", False),
        ("sql", True, "on", False),
        ("direct", True, "on", False),
    ],
)
def test_when_the_web_is_used(route, needs_web, choice, expected):
    assert AgentPipeline._wants_web(request(web=choice), guard(route_to=route, needs_web=needs_web)) is expected


async def test_web_answers_are_not_cached_and_carry_their_links(monkeypatch):
    result = RAGResult(response_text="React 19.", knowledge_source="web", web_sources=[{"title": "react.dev", "url": "https://react.dev"}])
    pipeline = build_pipeline(monkeypatch, guard(route_to="web", needs_web=True), rag_result=result)
    response = await pipeline._process_traced(request("latest react version"))
    assert response.metadata.knowledge_source == "web"
    assert [(c.source_id, c.source_name) for c in response.citations] == [("https://react.dev", "react.dev")]
    pipeline.cache.session_store.assert_not_awaited()
    assert pipeline.rag.run.await_args.args[0]["use_web"] is True


async def test_ordinary_answers_are_still_cached_and_only_document_answers_are_verified(monkeypatch):
    pipeline = build_pipeline(monkeypatch, guard(route_to="general"))
    await pipeline._process_traced(request())
    pipeline.cache.session_store.assert_awaited_once()
    pipeline.verification.run.assert_not_awaited()


def test_the_doc_scopes_always_include_the_library():
    assert AgentPipeline._doc_scopes("chat-1") == ["chat-1", settings.library_scope]
    assert AgentPipeline._doc_scopes("") == [settings.library_scope]
    assert AgentPipeline._doc_scopes(settings.library_scope) == [settings.library_scope]


def test_the_web_can_be_switched_off_for_the_whole_service(monkeypatch):
    monkeypatch.setattr(settings, "web_search_enabled", False)
    assert AgentPipeline._wants_web(request(web="on"), guard(route_to="web")) is False
