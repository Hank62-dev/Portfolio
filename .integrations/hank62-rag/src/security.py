"""Who may use this service.

The service answers anyone who can reach its address, and it spends the Gemini quota and holds the documents. So a request
must carry a ticket from the realtime server (the one that knows the owner's password): a short-lived token signed with a
secret that only the two servers share (RAG_TOKEN_SECRET on both). The ticket is stateless: this side only checks the signature
and the expiry. Without the secret set the service stays open, as before, and says so in its log at start-up.

Ticket format (made by server/ragToken.mjs):  base64url(JSON {"aud": "hank62-rag", "exp": <seconds>}) + "." + base64url(HMAC-SHA256)
"""

import base64
import hashlib
import hmac
import json
import time

from fastapi import Header, HTTPException

from src.config import settings

AUDIENCE = "hank62-rag"


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def verify_ticket(token: str, secret: str, now: float | None = None) -> bool:
    """Whether `token` was signed with `secret`, is meant for this service and has not expired. Never raises."""
    try:
        body, signature, *rest = token.split(".")
        if rest or not body or not signature:
            return False
        expected = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64decode(signature)):
            return False
        payload = json.loads(_b64decode(body))
        return payload.get("aud") == AUDIENCE and float(payload.get("exp", 0)) > (time.time() if now is None else now)
    except Exception:  # a malformed ticket is simply not a valid one
        return False


async def require_ticket(authorization: str | None = Header(default=None)) -> None:
    """FastAPI dependency for every route that does something: 401 without a valid ticket (when a secret is set)."""
    secret = settings.rag_token_secret
    if not secret:
        return
    token = authorization[7:].strip() if authorization and authorization[:7].lower() == "bearer " else ""
    if not verify_ticket(token, secret):
        raise HTTPException(status_code=401, detail="A valid ticket is required.")
