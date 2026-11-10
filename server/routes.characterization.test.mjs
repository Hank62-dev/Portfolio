import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

// A picture of the server's routes as they are, taken before the code is moved around: every route, and what it answers to
// someone who is not signed in. If a route goes missing, appears, or stops asking for the session after a move, this fails.
// It is about who may reach what, not about what each route does (that is in the other tests).

const ORIGIN = 'https://hank.example';
const PASSWORD = 'correct horse battery staple';

// what each route answers without a session (from a trusted origin, with an empty JSON body where it takes one)
const WITHOUT_SESSION = {
  'GET /health': 200,
  'GET /api/auth/session': 200,
  'POST /api/auth/refresh': 401,
  'POST /api/auth/login': 401,
  'POST /api/auth/logout': 200,
  'GET /api/state': 401,
  'POST /api/tasks': 401,
  'GET /api/push/key': 401,
  'POST /api/push/subscribe': 401,
  'POST /api/push/unsubscribe': 401,
  'POST /api/push/test': 401,
  'GET /api/ai/usage': 401,
  'POST /api/ai/dj': 401,
  'POST /api/ai/note': 401,
  'POST /api/ai/ask': 401,
  'POST /api/ai/cards': 401,
  'POST /api/ai/organize': 401,
  'POST /api/ai/receipt': 401,
  'POST /api/ai/review': 401,
  'POST /api/ai/command': 401,
  'GET /api/sync/status': 401,
  'GET /api/sync/pull': 401,
  'POST /api/sync/push': 401,
  'PUT /api/sync/blob': 401,
  'GET /api/sync/blob': 401,
  'POST /api/ai/transcribe': 401,
  'POST /api/ai/content': 401,
  'POST /api/ai/pitch': 401,
  'GET /api/discord/channels': 401,
  'POST /api/discord/post': 401,
  'POST /api/ai/image': 401,
  'POST /api/rag/token': 401,
  'GET /api/podcasts/search': 401,
  'GET /api/podcasts/feed': 401,
  'GET /api/calendar/status': 401,
  'POST /api/calendar/google/connect': 401,
  'GET /api/calendar/google/callback': 302,
  'POST /api/calendar/google/disconnect': 401,
  'POST /api/calendar/google/select': 401,
  'GET /api/calendar/events': 401,
  'POST /api/calendar/events/create': 401,
  'POST /api/calendar/events/update': 401,
  'POST /api/calendar/events/delete': 401,
  'GET /api/briefing/calendar': 401,
};

describe('the routes, as they were before the refactor', () => {
  let app;
  let base;

  const call = (route, { origin = ORIGIN, cookie } = {}) => {
    const [method, path] = route.split(' ');
    const body = method === 'GET' ? undefined : method === 'PUT' ? 'x' : '{}';
    return fetch(`${base}${path}`, {
      method,
      redirect: 'manual',
      headers: { 'Content-Type': method === 'PUT' ? 'application/octet-stream' : 'application/json', ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body,
    });
  };

  beforeAll(async () => {
    // generous rate limits, so the sweep below is not cut short by them
    const config = loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN });
    config.rateLimit = { general: { max: 10_000, windowMs: 60_000 }, heavy: { max: 10_000, windowMs: 60_000 }, auth: { max: 10_000, windowMs: 60_000 } };
    app = createApp(config, { fetchImpl: () => Promise.reject(new Error('no network in this test')) });
    base = `http://127.0.0.1:${await app.listen(0)}`;
  });

  afterAll(() => app.close());

  it('answers every route the same way when nobody is signed in', async () => {
    const seen = {};
    for (const route of Object.keys(WITHOUT_SESSION)) seen[route] = (await call(route)).status;
    expect(seen).toEqual(WITHOUT_SESSION);
  });

  it('has no route beyond the known ones (a made-up path is 404)', async () => {
    expect((await call('GET /api/not-a-route')).status).toBe(404);
    expect((await call('DELETE /api/state')).status).toBe(404);
  });

  it('turns away a state-changing request from another origin before it reaches a route', async () => {
    for (const route of Object.keys(WITHOUT_SESSION).filter((r) => !r.startsWith('GET '))) {
      expect((await call(route, { origin: 'https://evil.example' })).status, route).toBe(403);
    }
  });

  it('lets a signed-in owner past the session check on every protected route', async () => {
    const login = await call('POST /api/auth/login');
    expect(login.status).toBe(401); // the empty body is a wrong password
    const ok = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ password: PASSWORD }) });
    const cookie = ok.headers.get('set-cookie').split(';')[0];
    for (const route of Object.entries(WITHOUT_SESSION).filter(([, status]) => status === 401).map(([r]) => r)) {
      if (route === 'POST /api/auth/refresh' || route === 'POST /api/auth/login') continue; // these do not use the session
      expect((await call(route, { cookie })).status, route).not.toBe(401);
    }
  });
});
