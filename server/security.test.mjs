import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.mjs';
import { createAuth, hashPassword, verifyPassword } from './services/auth.mjs';
import { loadConfig } from './config.mjs';
import { clientKey } from './http/http.mjs';
import { createLimiter } from './http/limits.mjs';
import { mintRagToken } from './services/ragToken.mjs';
import { createSync, safeMime } from './services/sync.mjs';

const ORIGIN = 'https://hank.example';
const PASSWORD = 'correct horse battery staple';

describe('who is asking', () => {
  const req = (forwarded, remote = '10.0.0.1') => ({ headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded }, socket: { remoteAddress: remote } });

  it('takes the address the proxy saw, not the ones the client wrote itself', () => {
    // the client sent "1.1.1.1, 2.2.2.2"; Render's proxy added the address it really saw: 9.9.9.9
    expect(clientKey(req('1.1.1.1, 2.2.2.2, 9.9.9.9'))).toBe('9.9.9.9');
    expect(clientKey(req('9.9.9.9'))).toBe('9.9.9.9');
  });

  it('counts the proxies in front of the server, and falls back to the socket', () => {
    expect(clientKey(req('7.7.7.7, 8.8.8.8'), 2)).toBe('7.7.7.7');
    expect(clientKey(req('8.8.8.8'), 3)).toBe('8.8.8.8');
    expect(clientKey(req(undefined, '203.0.113.9'))).toBe('203.0.113.9');
    expect(clientKey(req('', '203.0.113.9'))).toBe('203.0.113.9');
  });
});

describe('the limiter', () => {
  it('lets a number through per window, then says when to come back, then starts again', () => {
    let clock = 0;
    const limiter = createLimiter({ max: 3, windowMs: 1000, now: () => clock });
    expect([1, 2, 3].map(() => limiter.hit('a').ok)).toEqual([true, true, true]);
    const refused = limiter.hit('a');
    expect(refused).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect(limiter.hit('b').ok).toBe(true); // somebody else is not held back
    clock = 1001;
    expect(limiter.hit('a').ok).toBe(true);
  });

  it('forgets old windows so it cannot grow without end', () => {
    let clock = 0;
    const limiter = createLimiter({ max: 1, windowMs: 1000, now: () => clock });
    for (let i = 0; i < 100; i += 1) limiter.hit(`client-${i}`);
    clock = 5000;
    limiter.hit('later');
    expect(limiter.size()).toBe(1);
  });
});

describe('passwords', () => {
  it('are kept as a salted slow hash that only the right password matches', () => {
    const hash = hashPassword(PASSWORD);
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain(PASSWORD);
    expect(hashPassword(PASSWORD)).not.toBe(hash); // a new salt each time
    expect(verifyPassword(PASSWORD, hash)).toBe(true);
    expect(verifyPassword('wrong password here', hash)).toBe(false);
    expect(verifyPassword('', hash)).toBe(false);
    expect(verifyPassword(PASSWORD, 'not a hash')).toBe(false);
    expect(verifyPassword(PASSWORD, undefined)).toBe(false);
  });

  const options = { accessTtlMs: 1000, refreshTtlMs: 10000, secureCookie: true, loginLimit: { maxFailures: 2, maxFailuresGlobal: 4, windowMs: 5000 } };

  it('let someone sign in with a hash in the settings instead of the password itself', () => {
    const auth = createAuth({ ...options, passwordHash: hashPassword(PASSWORD) });
    expect(auth.login('ip', PASSWORD).ok).toBe(true);
    expect(auth.login('ip', 'nope nope nope nope').ok).toBe(false);
  });

  it('count wrong guesses from every address together, not just from each', () => {
    let clock = 0;
    const auth = createAuth({ ...options, password: PASSWORD, now: () => clock });
    // four different addresses, one wrong guess each: none is over its own limit, but together they are
    for (const ip of ['a', 'b', 'c', 'd']) expect(auth.login(ip, 'wrong').ok).toBe(false);
    const locked = auth.login('e', PASSWORD); // even the right password waits
    expect(locked.ok).toBe(false);
    expect(locked.retryAfterSeconds).toBeGreaterThan(0);
    clock = 6000;
    expect(auth.login('e', PASSWORD).ok).toBe(true);
  });
});

describe('stored files', () => {
  it('may only say they are what the store holds, and never something a browser would run', () => {
    expect(safeMime('photos', 'image/jpeg')).toBe('image/jpeg');
    expect(safeMime('photos', 'IMAGE/PNG')).toBe('IMAGE/PNG');
    expect(safeMime('memos', 'audio/webm;codecs=opus')).toBe('audio/webm;codecs=opus');
    for (const [store, mime] of [['photos', 'text/html'], ['photos', 'image/svg+xml'], ['photos', 'application/javascript'], ['images', 'audio/webm'], ['memos', 'image/png'], ['notes', 'image/png'], ['photos', undefined]]) {
      expect(safeMime(store, mime), `${store} ${mime}`).toBe('application/octet-stream');
    }
  });

  it('are refused on the way in when they claim to be a page or a script', async () => {
    const db = new PGlite();
    const sync = createSync({ db, maxBlobBytes: 1000, quotaBytes: 5000 });
    for (const mime of ['text/html', 'image/svg+xml', 'application/octet-stream', '']) {
      await expect(sync.putBlob({ store: 'photos', id: 'p1', mime, data: Buffer.from([1, 2, 3]) })).rejects.toMatchObject({ status: 400 });
    }
    await expect(sync.putBlob({ store: 'photos', id: 'p1', mime: 'image/jpeg', data: Buffer.from([1, 2, 3]), updatedAt: 1 })).resolves.toMatchObject({ ok: true });
    // a file stored before this rule, under a type that is no longer allowed, is handed back as a plain download
    await db.query(`UPDATE sync_blobs SET mime = 'text/html' WHERE id = 'p1'`);
    expect((await sync.getBlob({ store: 'photos', id: 'p1' })).mime).toBe('application/octet-stream');
  });
});

describe('the running server', () => {
  let app;
  let base;
  let cookie;

  const call = (path, { method = 'GET', body, headers = {}, origin = ORIGIN } = {}) =>
    fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });

  beforeAll(async () => {
    const config = loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN, RAG_TOKEN_SECRET: 'shared-secret-for-the-test' });
    config.rateLimit.heavy = { max: 3, windowMs: 60000 };
    app = createApp(config);
    base = `http://127.0.0.1:${await app.listen(0)}`;
    const login = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
    cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  });

  afterAll(() => app.close());

  it('puts security headers on every answer', async () => {
    for (const path of ['/health', '/api/state', '/nope']) {
      const res = await call(path);
      expect(res.headers.get('x-content-type-options'), path).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      expect(res.headers.get('strict-transport-security')).toContain('max-age=31536000');
      expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
    expect((await call('/api/state', { method: 'OPTIONS' })).headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('answers a stranger with nothing about the set-up', async () => {
    const body = await (await call('/health', { headers: { Cookie: '' } })).text();
    expect(JSON.parse(body)).toEqual({ ok: true });
    expect((await call('/api/auth/session', { headers: { Cookie: '' } })).status).toBe(200);
    expect(await (await call('/api/state', { headers: { Cookie: '' } })).json()).toEqual({ error: 'Authentication required' });
  });

  it('slows down what costs something to answer, per address', async () => {
    const statuses = [];
    for (let i = 0; i < 5; i += 1) statuses.push((await call('/api/podcasts/search?q=a', { headers: { 'X-Forwarded-For': '1.1.1.1, 9.9.9.9' } })).status);
    expect(statuses.slice(0, 3)).toEqual([400, 400, 400]); // answered (the search is too short)
    expect(statuses.slice(3)).toEqual([429, 429]);
    const slowed = await call('/api/podcasts/search?q=a', { headers: { 'X-Forwarded-For': '5.5.5.5, 9.9.9.9' } });
    expect(slowed.status).toBe(429); // the same proxy-seen address: changing the client's own header does not help
    expect(slowed.headers.get('retry-after')).toMatch(/^\d+$/);
    expect((await call('/api/podcasts/search?q=a', { headers: { 'X-Forwarded-For': '8.8.8.8' } })).status).toBe(400); // somebody else is fine
  });

  it('hands the owner, and only the owner, a ticket for the RAG service that it can check', async () => {
    const stranger = await call('/api/rag/token', { method: 'POST', body: {}, headers: { Cookie: '', 'X-Forwarded-For': '3.3.3.3' } });
    expect(stranger.status).toBe(401);
    const { enabled, token, expiresIn } = await (await call('/api/rag/token', { method: 'POST', body: {}, headers: { 'X-Forwarded-For': '4.4.4.4' } })).json();
    expect(enabled).toBe(true);
    expect(expiresIn).toBe(900);
    const [body, signature] = token.split('.');
    expect(signature).toBe(createHmac('sha256', 'shared-secret-for-the-test').update(body).digest('base64url'));
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    expect(payload.aud).toBe('hank62-rag');
    expect(payload.exp * 1000).toBeGreaterThan(Date.now());
    expect(payload.exp * 1000).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000 + 1000);
  });

  it('mints tickets that name their audience and expire', () => {
    const token = mintRagToken({ secret: 's', ttlMs: 1000, now: () => 5_000_000 });
    expect(JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString())).toEqual({ aud: 'hank62-rag', exp: 5001 });
  });
});

describe('without a RAG secret', () => {
  it('says the RAG service is not protected rather than inventing a ticket', async () => {
    const app = createApp(loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN }));
    const base = `http://127.0.0.1:${await app.listen(0)}`;
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ password: PASSWORD }) });
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const res = await fetch(`${base}/api/rag/token`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie }, body: '{}' });
    expect(await res.json()).toEqual({ enabled: false, token: '', expiresIn: 0 });
    await app.close();
  });
});
