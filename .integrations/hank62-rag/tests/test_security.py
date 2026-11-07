"""The ticket check that keeps the service from answering strangers (src/security.py)."""

import base64
import hashlib
import hmac
import json

import pytest
from fastapi import HTTPException

from src import security
from src.security import verify_ticket

SECRET = "shared-secret-for-the-test"


def make(secret=SECRET, aud="hank62-rag", exp=2_000_000_000):
    body = base64.urlsafe_b64encode(json.dumps({"aud": aud, "exp": exp}).encode()).rstrip(b"=").decode()
    sig = base64.urlsafe_b64encode(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
    return f"{body}.{sig}"


def test_a_good_ticket_passes():
    assert verify_ticket(make(), SECRET, now=1_000_000_000)


def test_wrong_secret_audience_or_expiry_fail():
    assert not verify_ticket(make(secret="another-secret"), SECRET, now=1_000_000_000)
    assert not verify_ticket(make(aud="something-else"), SECRET, now=1_000_000_000)
    assert not verify_ticket(make(exp=500), SECRET, now=1_000_000_000)


@pytest.mark.parametrize("token", ["", "x", "a.b", "a.b.c", ".", "!!!.???", make() + ".extra", make()[:-3]])
def test_garbage_is_not_a_ticket(token):
    assert not verify_ticket(token, SECRET, now=1_000_000_000)


def test_a_changed_body_breaks_the_signature():
    body, sig = make().split(".")
    forged = base64.urlsafe_b64encode(json.dumps({"aud": "hank62-rag", "exp": 9_999_999_999}).encode()).rstrip(b"=").decode()
    assert not verify_ticket(f"{forged}.{sig}", SECRET, now=1_000_000_000)


@pytest.mark.asyncio
async def test_the_dependency_refuses_without_a_ticket_and_lets_one_through(monkeypatch):
    monkeypatch.setattr(security.settings, "rag_token_secret", SECRET)
    with pytest.raises(HTTPException) as refused:
        await security.require_ticket(None)
    assert refused.value.status_code == 401
    with pytest.raises(HTTPException):
        await security.require_ticket("Bearer nonsense")
    with pytest.raises(HTTPException):
        await security.require_ticket(make())  # not a Bearer header
    assert await security.require_ticket(f"Bearer {make()}") is None
    assert await security.require_ticket(f"bearer  {make()}") is None


@pytest.mark.asyncio
async def test_without_a_secret_the_service_stays_open(monkeypatch):
    monkeypatch.setattr(security.settings, "rag_token_secret", "")
    assert await security.require_ticket(None) is None
