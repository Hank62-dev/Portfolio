import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createApp } from './app.mjs';
import { createAuth } from './auth.mjs';
import { loadConfig } from './config.mjs';
import { randomFleet } from '../src/features/spacehank/games/battleship.js';

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
  const options = { password: PASSWORD, accessTtlMs: 1000, refreshTtlMs: 10000, secureCookie: true, loginLimit: { maxFailures: 2, windowMs: 5000 } };
  const pair = (cookies) => Object.fromEntries(cookies.map((c) => c.split(';')[0].split('=')));
  const request = (cookies) => ({ headers: { cookie: Object.entries(pair(cookies)).map(([k, v]) => `${k}=${v}`).join('; ') } });

  it('issues a short access token that expires', () => {
    let now = 0;
    const auth = createAuth({ ...options, now: () => now });
    const { ok, cookies } = auth.login('ip', PASSWORD);
    expect(ok).toBe(true);
    expect(cookies).toHaveLength(2);
    const req = request(cookies);
    expect(auth.isAuthorized(req)).toBe(true);
    now = 1001;
    expect(auth.isAuthorized(req)).toBe(false);
  });

  it('trades a refresh token for a new pair, and the 30 days start over', () => {
    let now = 0;
    const auth = createAuth({ ...options, now: () => now });
    const { cookies } = auth.login('ip', PASSWORD);
    now = 1500; // the access token has run out, the refresh token has not
    expect(auth.isAuthorized(request(cookies))).toBe(false);
    const renewed = auth.refresh(request(cookies));
    expect(renewed.ok).toBe(true);
    expect(auth.isAuthorized(request(renewed.cookies))).toBe(true);
    now = 9000; // past the first refresh token's 10 s, but the renewed one was issued at 1500
    expect(auth.refresh(request(renewed.cookies)).ok).toBe(true);
    now = 20000;
    expect(auth.refresh(request(renewed.cookies)).ok).toBe(false);
  });

  it('keeps working after the server restarts, because the tokens are signed rather than remembered', () => {
    const before = createAuth(options);
    const { cookies } = before.login('ip', PASSWORD);
    const after = createAuth(options); // a new process, with no memory of the first
    expect(after.isAuthorized(request(cookies))).toBe(true);
  });

  it('refuses forged, tampered, mixed-up and other-password tokens', () => {
    const auth = createAuth(options);
    const { cookies } = auth.login('ip', PASSWORD);
    const { spacehank_session: access, spacehank_refresh: refresh } = pair(cookies);
    const [body, signature] = access.split('.');
    expect(auth.isAuthorized({ headers: { cookie: `spacehank_session=${body}.${signature.slice(0, -2)}AA` } })).toBe(false);
    expect(auth.isAuthorized({ headers: { cookie: `spacehank_session=${body}` } })).toBe(false);
    expect(auth.isAuthorized({ headers: { cookie: 'spacehank_session=garbage' } })).toBe(false);
    // a refresh token is not an access token, and the other way round
    expect(auth.isAuthorized({ headers: { cookie: `spacehank_session=${refresh}` } })).toBe(false);
    expect(auth.refresh({ headers: { cookie: `spacehank_refresh=${access}` } }).ok).toBe(false);
    // another password means another key
    const other = createAuth({ ...options, password: 'a-different-password-entirely' });
    expect(other.isAuthorized(request(cookies))).toBe(false);
    expect(other.refresh(request(cookies)).ok).toBe(false);
  });

  it('lets a separate session secret sign the tokens', () => {
    const one = createAuth({ ...options, sessionSecret: 'one' });
    const { cookies } = one.login('ip', PASSWORD);
    expect(createAuth({ ...options, sessionSecret: 'one' }).isAuthorized(request(cookies))).toBe(true);
    expect(createAuth({ ...options, sessionSecret: 'two' }).isAuthorized(request(cookies))).toBe(false);
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
    expect(createAuth(options).accessCookie('t')).toContain('SameSite=None; Secure');
    expect(createAuth({ ...options, secureCookie: false }).accessCookie('t')).toContain('SameSite=Lax');
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

    const out = await call('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    const cleared = out.headers.getSetCookie().join('\n');
    expect(cleared).toMatch(/spacehank_session=; .*Max-Age=0/);
    expect(cleared).toMatch(/spacehank_refresh=; .*Max-Age=0/);
  });

  it('renews the session from the refresh cookie, on its own and when asked', async () => {
    const login = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
    const jar = Object.fromEntries(login.headers.getSetCookie().map((c) => c.split(';')[0].split('=')));
    const refreshOnly = `spacehank_refresh=${jar.spacehank_refresh}`;
    expect(login.headers.getSetCookie().find((c) => c.startsWith('spacehank_refresh='))).toMatch(/Path=\/api\/auth/);

    // an access token that is gone (it ran out, or the server slept): asking who is signed in renews it
    const session = await call('/api/auth/session', { headers: { Cookie: refreshOnly } });
    expect((await session.json()).authenticated).toBe(true);
    const renewed = session.headers.getSetCookie();
    expect(renewed.some((c) => c.startsWith('spacehank_session='))).toBe(true);
    const fresh = renewed.find((c) => c.startsWith('spacehank_session=')).split(';')[0];
    expect((await call('/api/state', { headers: { Cookie: fresh } })).status).toBe(200);

    // the explicit call does the same
    const refreshed = await call('/api/auth/refresh', { method: 'POST', headers: { Cookie: refreshOnly } });
    expect(refreshed.status).toBe(200);
    expect(refreshed.headers.getSetCookie()).toHaveLength(2);

    // nothing to renew from
    const none = await call('/api/auth/refresh', { method: 'POST' });
    expect(none.status).toBe(401);
    expect(none.headers.getSetCookie().join('\n')).toMatch(/Max-Age=0/);
    expect((await (await call('/api/auth/session', { headers: { Cookie: 'spacehank_refresh=garbage' } })).json()).authenticated).toBe(false);
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

  it('opens the online sea battle to anyone from the allowed origin, with no session, and lets two players meet', async () => {
    const url = `ws://127.0.0.1:${port}/battle`;
    const open = (headers) =>
      new Promise((resolve) => {
        const socket = new WebSocket(url, { headers });
        const messages = [];
        socket.on('message', (data) => messages.push(JSON.parse(data)));
        socket.on('open', () => resolve({ ok: true, socket, messages }));
        socket.on('unexpected-response', (_req, res) => resolve({ ok: false, status: res.statusCode }));
        socket.on('error', () => {});
      });
    const until = async (check) => {
      for (let i = 0; i < 100 && !check(); i += 1) await new Promise((resolve) => setTimeout(resolve, 20));
      return check();
    };

    expect(await open({ Origin: 'https://evil.example' })).toMatchObject({ ok: false, status: 403 });
    expect(await open({})).toMatchObject({ ok: false, status: 403 });

    const a = await open({ Origin: ORIGIN });
    const b = await open({ Origin: ORIGIN });
    expect(a.ok && b.ok).toBe(true);
    a.socket.send(JSON.stringify({ type: 'create', name: 'An' }));
    expect(await until(() => a.messages.some((m) => m.type === 'joined'))).toBe(true);
    const { code } = a.messages.find((m) => m.type === 'joined');
    b.socket.send(JSON.stringify({ type: 'join', code, name: 'Binh' }));
    expect(await until(() => a.messages.some((m) => m.type === 'room' && m.phase === 'place'))).toBe(true);
    for (const player of [a, b]) player.socket.send(JSON.stringify({ type: 'ready', fleet: randomFleet().map((s) => ({ cells: s.cells })) }));
    expect(await until(() => b.messages.some((m) => m.type === 'room' && m.phase === 'play'))).toBe(true);

    // too big a message is refused outright
    a.socket.send('x'.repeat(5000));
    expect(await until(() => a.socket.readyState === 3)).toBe(true);
    b.socket.close();
  });
});
