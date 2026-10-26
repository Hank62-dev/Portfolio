from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from google.genai import types

from src.agents.rag_agent import RAGAgent
from src.agents.verification_agent import VerificationAgent
from src.config import settings
from src.llm.gemini_client import GeminiClient
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
