import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'spacehank_session';

const digest = (value) => createHash('sha256').update(String(value ?? '')).digest();

/** Password login, in-memory sessions and a failed-attempt limiter. */
export const createAuth = ({ password, sessionTtlMs, secureCookie, loginLimit, now = Date.now }) => {
  const sessions = new Map();
  const failures = new Map();
  const attrs = secureCookie ? 'SameSite=None; Secure' : 'SameSite=Lax';
  const maxAge = Math.floor(sessionTtlMs / 1000);

  // Compare fixed-length digests so neither the timing nor the length of the secret leaks.
  const passwordMatches = (candidate) => timingSafeEqual(digest(candidate), digest(password));

  const readCookie = (req, name) =>
    req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);

  const prune = () => {
    const t = now();
    for (const [token, session] of sessions) if (session.expiresAt < t) sessions.delete(token);
    for (const [key, entry] of failures) if (entry.resetAt < t) failures.delete(key);
  };

  const isAuthorized = (req) => {
    const token = readCookie(req, SESSION_COOKIE);
    const session = token && sessions.get(token);
    if (!session || session.expiresAt < now()) {
      if (token) sessions.delete(token);
      return false;
    }
    return true;
  };

  /** Returns { ok: true, token } or { ok: false, retryAfterSeconds? } (set when the client is locked out). */
  const login = (clientKey, candidate) => {
    prune();
    const entry = failures.get(clientKey);
    if (entry && entry.count >= loginLimit.maxFailures) {
      return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now()) / 1000) };
    }
    if (!passwordMatches(candidate)) {
      failures.set(clientKey, {
        count: (entry?.count ?? 0) + 1,
        resetAt: entry?.resetAt ?? now() + loginLimit.windowMs,
      });
      return { ok: false };
    }
    failures.delete(clientKey);
    const token = randomUUID();
    sessions.set(token, { expiresAt: now() + sessionTtlMs });
    return { ok: true, token };
  };

  const logout = (req) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) sessions.delete(token);
  };

  const sessionCookie = (token) => `${SESSION_COOKIE}=${token}; HttpOnly; ${attrs}; Max-Age=${maxAge}; Path=/`;
  const clearCookie = () => `${SESSION_COOKIE}=; HttpOnly; ${attrs}; Max-Age=0; Path=/`;

  return { isAuthorized, login, logout, sessionCookie, clearCookie };
};
