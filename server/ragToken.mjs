import { createHmac } from 'node:crypto';

// The Hank RAG service (a separate Python service) answers anyone who can reach its address, and it spends the Gemini quota
// and holds the documents. So it only answers a request that carries a token from here: a short-lived ticket, signed with a
// secret that only the two servers share (RAG_TOKEN_SECRET on both). The browser asks this server for a ticket (which needs
// the owner's session), then shows it to the RAG service. The ticket is stateless: the RAG service just checks the signature.

export const RAG_TOKEN_TTL_MS = 15 * 60 * 1000;

/** A signed ticket: base64url(JSON { aud, exp (seconds) }) + '.' + base64url(HMAC-SHA256). The Python service checks the same. */
export const mintRagToken = ({ secret, ttlMs = RAG_TOKEN_TTL_MS, now = Date.now }) => {
  const body = Buffer.from(JSON.stringify({ aud: 'hank62-rag', exp: Math.floor((now() + ttlMs) / 1000) })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
