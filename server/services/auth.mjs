import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'spacehank_session'; // the short access token: sent everywhere, opens the socket
export const REFRESH_COOKIE = 'spacehank_refresh'; // the long refresh token: sent only to /api/auth, trades for a new access token

// A password kept as a scrypt hash (a slow, salted, one-way function), so the setting holds something that cannot be turned back
// into the password. Format: scrypt$N$r$p$salt$hash (salt and hash in base64url). Made by `npm run spacehank:hash-password`.
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 32 };
const MAX_PASSWORD_CHARS = 256; // a longer guess is wrong anyway, and hashing it is not free

export const hashPassword = (password) => {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, SCRYPT.keyLength, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), hash.toString('base64url')].join('$');
};

/** Whether `candidate` is the password that `stored` (a hashPassword result) was made from. Never throws. */
export const verifyPassword = (candidate, stored) => {
  try {
    const [kind, N, r, p, salt, hash] = String(stored).split('$');
    if (kind !== 'scrypt') return false;
    const expected = Buffer.from(hash, 'base64url');
    const actual = scryptSync(String(candidate ?? '').slice(0, MAX_PASSWORD_CHARS), Buffer.from(salt, 'base64url'), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: 128 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

/**
 * How long a client is locked out after its `strikes`-th wrong password in a row: nothing for the first few (a typo is
 * not an attack), then `baseLockMs`, doubling with every further wrong guess up to `maxLockMs`. 4 free, 30 s base, 1 h cap:
 * 30 s, 1 min, 2 min, 4 min, 8 min, 16 min, 32 min, 1 h, 1 h… so guessing becomes hopeless while one slip costs nothing.
 */
export const lockoutMs = (strikes, { freeFailures = 4, baseLockMs = 30_000, maxLockMs = 3_600_000 } = {}) =>
  strikes <= freeFailures ? 0 : Math.min(maxLockMs, baseLockMs * 2 ** (strikes - freeFailures - 1));

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
export const createAuth = ({ password, passwordHash = '', sessionSecret, accessTtlMs, refreshTtlMs, secureCookie, loginLimit, now = Date.now }) => {
  const failures = new Map();
  let allFailures = { count: 0, resetAt: 0 }; // wrong guesses from every address together: guessers who change address are still counted
  const attrs = secureCookie ? 'SameSite=None; Secure' : 'SameSite=Lax';
  const key = createHmac('sha256', sessionSecret || passwordHash || String(password)).update('spacehank/session/v1').digest();

  // Compare fixed-length digests so neither the timing nor the length of the secret leaks.
  const passwordMatches = (candidate) => (passwordHash ? verifyPassword(candidate, passwordHash) : timingSafeEqual(digest(candidate), digest(password)));

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

  // a client's wrong guesses are forgotten a while (a day by default) after its last one, once it is not locked out
  const forgetMs = loginLimit.forgetMs ?? 24 * 60 * 60 * 1000;
  const prune = () => {
    const t = now();
    for (const [k, entry] of failures) if (entry.lockedUntil <= t && entry.lastAt + forgetMs < t) failures.delete(k);
  };

  const isAuthorized = (req) => valid(readCookie(req, SESSION_COOKIE), 'access');

  const accessCookie = (token) => `${SESSION_COOKIE}=${token}; HttpOnly; ${attrs}; Max-Age=${Math.floor(accessTtlMs / 1000)}; Path=/`;
  const refreshCookie = (token) => `${REFRESH_COOKIE}=${token}; HttpOnly; ${attrs}; Max-Age=${Math.floor(refreshTtlMs / 1000)}; Path=/api/auth`;

  /** The two Set-Cookie lines for a fresh pair of tokens. */
  const issue = () => [accessCookie(sign('access', accessTtlMs)), refreshCookie(sign('refresh', refreshTtlMs))];

  /**
   * Returns { ok: true, cookies } or { ok: false, locked, retryAfterSeconds?, attemptsLeft? }. `locked` is true when the
   * password was not even tried because the client is still locked out; a wrong guess that starts a lockout comes back
   * with `retryAfterSeconds` set, and one that does not says how many free tries are left before the first lockout.
   */
  const login = (clientKey, candidate) => {
    prune();
    const t = now();
    const entry = failures.get(clientKey);
    if (entry && entry.lockedUntil > t) return { ok: false, locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - t) / 1000) };
    if (allFailures.resetAt <= t) allFailures = { count: 0, resetAt: t + loginLimit.windowMs };
    if (loginLimit.maxFailuresGlobal && allFailures.count >= loginLimit.maxFailuresGlobal) {
      return { ok: false, locked: true, retryAfterSeconds: Math.ceil((allFailures.resetAt - t) / 1000) };
    }
    if (!passwordMatches(candidate)) {
      allFailures.count += 1;
      const strikes = (entry?.strikes ?? 0) + 1;
      const lock = lockoutMs(strikes, loginLimit);
      failures.set(clientKey, { strikes, lockedUntil: t + lock, lastAt: t });
      const free = loginLimit.freeFailures ?? 4;
      return lock ? { ok: false, locked: false, retryAfterSeconds: Math.ceil(lock / 1000) } : { ok: false, locked: false, attemptsLeft: free - strikes };
    }
    failures.delete(clientKey);
    return { ok: true, cookies: issue() };
  };

  /** Trades a good refresh token for a new pair (the 30 days start over). Returns { ok, cookies }. */
  const refresh = (req) => (valid(readCookie(req, REFRESH_COOKIE), 'refresh') ? { ok: true, cookies: issue() } : { ok: false });

  const clearCookies = () => [`${SESSION_COOKIE}=; HttpOnly; ${attrs}; Max-Age=0; Path=/`, `${REFRESH_COOKIE}=; HttpOnly; ${attrs}; Max-Age=0; Path=/api/auth`];

  return { isAuthorized, login, refresh, clearCookies, accessCookie };
};
