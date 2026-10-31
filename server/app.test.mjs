import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createApp } from './app.mjs';
import { createAuth } from './auth.mjs';
import { loadConfig } from './config.mjs';

const ORIGIN = 'https://hank.example';
const PASSWORD = 'correct horse battery staple';

describe('loadConfig', () => {
  it('requires a password and an origin', () => {
    expect(() => loadConfig({ SPACEHANK_ORIGIN: ORIGIN })).toThrow('SPACEHANK_PASSWORD');
    expect(() => loadConfig({ SPACEHANK_PASSWORD: PASSWORD })).toThrow('SPACEHANK_ORIGIN');
  });

  it('normalizes the origin and enables secure cookies for https', () => {
    const config = loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: `${ORIGIN}/` });
    expect(config.origin).toBe(ORIGIN);
    expect(config.secureCookie).toBe(true);
    expect(loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: 'http://localhost:5173' }).secureCookie).toBe(false);
  });
});

describe('auth', () => {
  const options = { password: PASSWORD, sessionTtlMs: 1000, secureCookie: true, loginLimit: { maxFailures: 2, windowMs: 5000 } };

  it('issues sessions that expire', () => {
    let now = 0;
    const auth = createAuth({ ...options, now: () => now });
    const { ok, token } = auth.login('ip', PASSWORD);
    expect(ok).toBe(true);
    const req = { headers: { cookie: `spacehank_session=${token}` } };
    expect(auth.isAuthorized(req)).toBe(true);
    now = 1001;
    expect(auth.isAuthorized(req)).toBe(false);
  });

  it('locks a client out after repeated failures, then lets it retry', () => {
    let now = 0;
    const auth = createAuth({ ...options, now: () => now });
    expect(auth.login('ip', 'nope').ok).toBe(false);
    expect(auth.login('ip', 'nope').ok).toBe(false);
    const locked = auth.login('ip', PASSWORD);
    expect(locked.ok).toBe(false);
    expect(locked.retryAfterSeconds).toBeGreaterThan(0);
    expect(auth.login('other-ip', PASSWORD).ok).toBe(true);
    now = 5001;
    expect(auth.login('ip', PASSWORD).ok).toBe(true);
  });

  it('sets cross-site cookie attributes only for https origins', () => {
    expect(createAuth(options).sessionCookie('t')).toContain('SameSite=None; Secure');
    expect(createAuth({ ...options, secureCookie: false }).sessionCookie('t')).toContain('SameSite=Lax');
  });
});

describe('realtime server', () => {
  let app;
  let base;
  let port;
  let cookie;

  const call = (path, { method = 'GET', body, origin = ORIGIN, headers = {} } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });

  beforeAll(async () => {
    const config = loadConfig({
      SPACEHANK_PASSWORD: PASSWORD,
      SPACEHANK_ORIGIN: ORIGIN,
      // A real worker: echoes the prompt it receives on stdin, then exits 0.
      SPACEHANK_CODEX_CMD: 'node -e "process.stdin.pipe(process.stdout)"',
    });
    app = createApp(config);
    port = await app.listen(0);
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(() => app.close());

  it('reports health and configured workers without authentication', async () => {
    const body = await (await call('/health')).json();
    expect(body).toMatchObject({ ok: true, mode: 'production', agents: 11, configuredWorkers: ['codex'] });
  });

  it('answers CORS preflight for the allowed origin only', async () => {
    const res = await call('/api/tasks', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('returns 404 for unknown routes and 401 for protected ones', async () => {
    expect((await call('/nope')).status).toBe(404);
    expect((await call('/api/state')).status).toBe(401);
    expect((await call('/api/tasks', { method: 'POST', body: {} })).status).toBe(401);
  });

  it('rejects state-changing requests from other origins or with no origin', async () => {
    const wrong = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD }, origin: 'https://evil.example' });
    expect(wrong.status).toBe(403);
    const none = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD }, origin: null });
    expect(none.status).toBe(403);
  });

  it('rejects wrong passwords and malformed or oversized bodies', async () => {
    expect((await call('/api/auth/login', { method: 'POST', body: { password: 'wrong' } })).status).toBe(401);
    expect((await call('/api/auth/login', { method: 'POST', body: '{not json' })).status).toBe(400);
    expect((await call('/api/auth/login', { method: 'POST', body: '[1,2]' })).status).toBe(400);
    expect((await call('/api/auth/login', { method: 'POST', body: { password: 'x'.repeat(70 * 1024) } })).status).toBe(413);
  });

  // A real child process is spawned here, which can take a while on a busy machine.
  it('logs in, exposes state, runs a worker and logs out', { timeout: 30000 }, async () => {
    const login = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie');
    expect(setCookie).toMatch(/HttpOnly; SameSite=None; Secure/);
    cookie = setCookie.split(';')[0];

    const session = await (await call('/api/auth/session', { headers: { Cookie: cookie } })).json();
    expect(session.authenticated).toBe(true);

    const bad = await call('/api/tasks', { method: 'POST', body: { agentId: 'nova', title: 'x' }, headers: { Cookie: cookie } });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/not configured/);
    expect((await call('/api/tasks', { method: 'POST', body: { agentId: 'ghost' }, headers: { Cookie: cookie } })).status).toBe(400);
    expect((await call('/api/tasks', { method: 'POST', body: { agentId: 'codex', title: 7 }, headers: { Cookie: cookie } })).status).toBe(400);

    const created = await call('/api/tasks', { method: 'POST', body: { agentId: 'codex', title: 'say hello', prompt: 'hello worker' }, headers: { Cookie: cookie } });
    expect(created.status).toBe(201);
    const task = await created.json();

    let state;
    for (let attempt = 0; attempt < 150; attempt += 1) {
      state = await (await call('/api/state', { headers: { Cookie: cookie } })).json();
      if (state.tasks.find((t) => t.id === task.id)?.status !== 'running') break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(state.tasks.find((t) => t.id === task.id).status).toBe('completed');
    expect(state.events.some((event) => event.action === 'output' && event.text === 'hello worker')).toBe(true);

    await call('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    expect((await call('/api/state', { headers: { Cookie: cookie } })).status).toBe(401);
  });

  it('only upgrades WebSockets from the allowed origin with a session', async () => {
    const login = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
    const sessionCookie = login.headers.get('set-cookie').split(';')[0];
    const url = `ws://127.0.0.1:${port}`;

    const open = (headers) =>
      new Promise((resolve) => {
        const socket = new WebSocket(url, { headers });
        socket.on('message', (data) => resolve({ ok: true, socket, message: JSON.parse(data) }));
        socket.on('unexpected-response', (_req, res) => resolve({ ok: false, status: res.statusCode }));
        socket.on('error', () => {});
      });

    const good = await open({ Origin: ORIGIN, Cookie: sessionCookie });
    expect(good.ok).toBe(true);
    expect(good.message.type).toBe('state');
    expect(good.message.agents).toHaveLength(11);
    good.socket.close();

    expect(await open({ Origin: 'https://evil.example', Cookie: sessionCookie })).toMatchObject({ ok: false, status: 403 });
    expect(await open({ Origin: ORIGIN })).toMatchObject({ ok: false, status: 401 });
  });
});
