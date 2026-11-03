import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'spacehank_session'; // the short access token: sent everywhere, opens the socket
export const REFRESH_COOKIE = 'spacehank_refresh'; // the long refresh token: sent only to /api/auth, trades for a new access token

const digest = (value) => createHash('sha256').update(String(value ?? '')).digest();
const b64 = (value) => Buffer.from(value).toString('base64url');

/**
 * Password login with two signed tokens, and a failed-attempt limiter.
 *
 * The tokens are signed (HMAC), not looked up in a list, so they stay valid when the server sleeps or restarts, which a free
 * Render service does all the time. The access token is short; when it runs out the page trades the refresh token for a new
 * one (and the refresh token's 30 days start over), so a phone that comes back after a week is still signed in.
 *
 * What this cannot do: take one token back before it runs out (there is no list to remove it from). Logging out clears the
 * cookies on this device; changing the password (or `SPACEHANK_SESSION_SECRET`) signs every device out at once.
 */
export const createAuth = ({ password, sessionSecret, accessTtlMs, refreshTtlMs, secureCookie, loginLimit, now = Date.now }) => {
  const failures = new Map();
  const attrs = secureCookie ? 'SameSite=None; Secure' : 'SameSite=Lax';
  const key = createHmac('sha256', sessionSecret || String(password)).update('spacehank/session/v1').digest();

  // Compare fixed-length digests so neither the timing nor the length of the secret leaks.
  const passwordMatches = (candidate) => timingSafeEqual(digest(candidate), digest(password));

  const sign = (type, ttlMs) => {
    const body = b64(JSON.stringify({ t: type, exp: now() + ttlMs }));
    return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
  };

  /** Whether a token is genuine, of this type, and not expired. */
  const valid = (token, type) => {
    if (typeof token !== 'string') return false;
    const [body, signature, ...rest] = token.split('.');
    if (!body || !signature || rest.length) return false;
    const expected = createHmac('sha256', key).update(body).digest();
    const given = Buffer.from(signature, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      return payload.t === type && Number.isFinite(payload.exp) && payload.exp > now();
    } catch {
      return false;
    }
  };

  const readCookie = (req, name) =>
    req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);

  const prune = () => {
    const t = now();
    for (const [k, entry] of failures) if (entry.resetAt < t) failures.delete(k);
  };

  const isAuthorized = (req) => valid(readCookie(req, SESSION_COOKIE), 'access');

  const accessCookie = (token) => `${SESSION_COOKIE}=${token}; HttpOnly; ${attrs}; Max-Age=${Math.floor(accessTtlMs / 1000)}; Path=/`;
  const refreshCookie = (token) => `${REFRESH_COOKIE}=${token}; HttpOnly; ${attrs}; Max-Age=${Math.floor(refreshTtlMs / 1000)}; Path=/api/auth`;

  /** The two Set-Cookie lines for a fresh pair of tokens. */
  const issue = () => [accessCookie(sign('access', accessTtlMs)), refreshCookie(sign('refresh', refreshTtlMs))];

  /** Returns { ok: true, cookies } or { ok: false, retryAfterSeconds? } (set when the client is locked out). */
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
    return { ok: true, cookies: issue() };
  };

  /** Trades a good refresh token for a new pair (the 30 days start over). Returns { ok, cookies }. */
  const refresh = (req) => (valid(readCookie(req, REFRESH_COOKIE), 'refresh') ? { ok: true, cookies: issue() } : { ok: false });

  const clearCookies = () => [`${SESSION_COOKIE}=; HttpOnly; ${attrs}; Max-Age=0; Path=/`, `${REFRESH_COOKIE}=; HttpOnly; ${attrs}; Max-Age=0; Path=/api/auth`];

  return { isAuthorized, login, refresh, clearCookies, accessCookie };
};
