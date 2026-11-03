from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from google.genai import types

from src.agents.rag_agent import RAGAgent
from src.agents.verification_agent import VerificationAgent
from src.config import settings
from src.llm.gemini_client import GeminiClient, is_busy
from src.schemas.internal import RAGResult


@pytest.fixture
def llm(monkeypatch):
    response = types.GenerateContentResponse(
        candidates=[
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"overall_groundedness": 1.0, "recommendation": "approved"}',
                        }
                    ]
                },
                "finish_reason": "STOP",
            }
        ],
        usage_metadata={
            "prompt_token_count": 12,
            "candidates_token_count": 7,
            "thoughts_token_count": 5,
            "total_token_count": 24,
        },
    )
    generate = AsyncMock(return_value=response)
    client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate)))
    monkeypatch.setattr("src.llm.gemini_client._get_client", lambda: client)
    return GeminiClient(), generate


async def test_reasoning_calls_main_model(llm):
    client, generate = llm
    result = await RAGAgent(client)._call_llm([{"role": "user", "content": "Hello"}], "reasoning")
    assert result["content"]
    assert generate.await_args.kwargs["model"] == settings.gemini_model


async def test_verification_calls_main_model(llm):
    client, generate = llm
    result = await VerificationAgent(client).execute(
        RAGResult(
            response_text="Delivery takes two days.",
            retrieved_chunks=[
                {"source": "policy", "text": "Delivery takes two days.", "score": 1.0}
            ],
        )
    )
    assert result.is_verified
    assert generate.await_args.kwargs["model"] == settings.gemini_model
    assert generate.await_args.kwargs["config"]["response_mime_type"] == "application/json"


async def test_fast_chat_keeps_fast_model(llm):
    client, generate = llm
    await client.fast_chat([{"role": "user", "content": "Hello"}], json_mode=True)
    assert generate.await_args.kwargs["model"] == settings.gemini_fast_model
    assert generate.await_args.kwargs["config"]["response_mime_type"] == "application/json"


async def test_chat_reports_real_token_usage(llm):
    client, _ = llm
    result = await client.chat([{"role": "user", "content": "Hello"}])
    assert result["usage"] == {"prompt": 12, "completion": 7, "total": 24}


@pytest.mark.parametrize("usage", [None, types.GenerateContentResponseUsageMetadata()])
async def test_chat_handles_missing_token_usage(llm, usage):
    client, generate = llm
    generate.return_value.usage_metadata = usage
    result = await client.chat([{"role": "user", "content": "Hello"}])
    assert result["usage"] == {"prompt": 0, "completion": 0, "total": 0}


@pytest.mark.parametrize(
    ("response", "reason"),
    [
        (types.GenerateContentResponse(prompt_feedback={"block_reason": "SAFETY"}), "SAFETY"),
        (types.GenerateContentResponse(candidates=[{"finish_reason": "MAX_TOKENS"}]), "MAX_TOKENS"),
        (types.GenerateContentResponse(), "None"),
        (
            types.GenerateContentResponse(
                candidates=[
                    {
                        "content": {"parts": [{"text": "  "}]},
                        "finish_reason": "STOP",
                    }
                ]
            ),
            "STOP",
        ),
    ],
)
async def test_empty_chat_reports_reason(llm, response, reason):
    client, generate = llm
    generate.return_value = response
    with pytest.raises(RuntimeError, match=f"Gemini returned no text .*{reason}"):
        await client.chat([{"role": "user", "content": "Hello"}])
    generate.assert_awaited_once()


BUSY = RuntimeError("503 UNAVAILABLE. {'error': {'code': 503, 'message': 'This model is currently experiencing high demand.', 'status': 'UNAVAILABLE'}}")


@pytest.fixture
def no_wait(monkeypatch):
    sleep = AsyncMock()
    monkeypatch.setattr("src.llm.gemini_client.asyncio.sleep", sleep)
    return sleep


@pytest.mark.parametrize(
    ("text", "busy"),
    [
        ("503 UNAVAILABLE", True),
        ("This model is currently experiencing high demand", True),
        ("500 INTERNAL", True),
        ("504 DEADLINE_EXCEEDED", True),
        ("404 NOT_FOUND. This model is no longer available", False),
        ("400 INVALID_ARGUMENT: max_output_tokens 5003 is too large", False),
    ],
)
def test_is_busy_tells_a_passing_failure_from_a_real_one(text, busy):
    assert is_busy(text) is busy


async def test_an_overloaded_model_is_tried_again(llm, no_wait):
    client, generate = llm
    ok = generate.return_value
    generate.side_effect = [BUSY, ok]
    result = await client.chat([{"role": "user", "content": "Hello"}])
    assert result["content"]
    assert generate.await_count == 2
    assert no_wait.await_count == 1


async def test_a_model_that_stays_busy_gives_way_to_the_fallback(llm, no_wait, monkeypatch):
    client, generate = llm
    ok = generate.return_value
    monkeypatch.setattr(settings, "gemini_fallback_model", "backup-model")
    generate.side_effect = [BUSY, BUSY, BUSY, ok]
    result = await client.chat([{"role": "user", "content": "Hello"}])
    assert [call.kwargs["model"] for call in generate.await_args_list] == [settings.gemini_model] * 3 + ["backup-model"]
    assert result["model"] == "backup-model"


async def test_without_a_fallback_a_busy_model_fails_after_its_retries(llm, no_wait, monkeypatch):
    client, generate = llm
    monkeypatch.setattr(settings, "gemini_fallback_model", "")
    generate.side_effect = BUSY
    with pytest.raises(RuntimeError, match="503"):
        await client.chat([{"role": "user", "content": "Hello"}])
    assert generate.await_count == 3


async def test_a_real_error_is_not_retried_and_does_not_use_the_fallback(llm, no_wait, monkeypatch):
    client, generate = llm
    monkeypatch.setattr(settings, "gemini_fallback_model", "backup-model")
    generate.side_effect = RuntimeError("404 NOT_FOUND. This model is no longer available to new users.")
    with pytest.raises(RuntimeError, match="404"):
        await client.chat([{"role": "user", "content": "Hello"}])
    assert generate.await_count == 1
    assert no_wait.await_count == 0
