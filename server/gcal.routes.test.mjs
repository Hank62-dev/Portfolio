import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const PASSWORD = 'correct horse battery staple';
const ORIGIN = 'https://workspace.example';
const CALLBACK = 'https://api.example/api/calendar/google/callback';
const MAIN = { id: 'me@example.com', summary: 'me@example.com', backgroundColor: '#3366cc', primary: true, accessRole: 'owner' };

const reply = (status, data) => ({ ok: status < 400, status, json: async () => data });

// Google, as the server sees it
const fakeGoogle = async (url, init = {}) => {
  const { pathname } = new URL(url);
  if (pathname === '/token') return reply(200, { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
  if (pathname === '/revoke') return reply(200, {});
  if (pathname === '/calendar/v3/users/me/calendarList') return reply(200, { items: [MAIN] });
  if (pathname.endsWith('/events') && (init.method ?? 'GET') === 'GET') {
    return reply(200, { items: [{ id: 'e1', summary: 'Dentist', start: { dateTime: '2026-11-10T09:00:00Z' }, end: { dateTime: '2026-11-10T10:00:00Z' } }] });
  }
  return reply(404, {});
};

describe('the Google Calendar routes', () => {
  let app;
  let base;
  let cookie = '';

  const call = (path, { method = 'GET', body, origin = ORIGIN } = {}) =>
    fetch(`${base}${path}`, {
      method,
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeAll(async () => {
    const env = { SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN, GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_REDIRECT_URI: CALLBACK, CALENDAR_TOKEN_KEY: 'k'.repeat(32) };
    app = createApp(loadConfig(env), { db: new PGlite(), fetchImpl: fakeGoogle });
    base = `http://127.0.0.1:${await app.listen(0)}`;
  });
  afterAll(() => app.close());

  it('keeps everything but the sign-in return behind the session', async () => {
    for (const [method, path] of [
      ['GET', '/api/calendar/status'],
      ['POST', '/api/calendar/google/connect'],
      ['POST', '/api/calendar/google/disconnect'],
      ['POST', '/api/calendar/google/select'],
      ['GET', '/api/calendar/events?from=2026-11-01T00:00:00Z&to=2026-11-02T00:00:00Z'],
      ['POST', '/api/calendar/events/create'],
      ['POST', '/api/calendar/events/update'],
      ['POST', '/api/calendar/events/delete'],
    ]) {
      expect((await call(path, { method, body: method === 'POST' ? {} : undefined })).status, `${method} ${path}`).toBe(401);
    }
  });

  it('signs in, connects, shows and changes events', async () => {
    const login = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
    cookie = login.headers.getSetCookie()[0].split(';')[0];

    expect(await (await call('/api/calendar/status')).json()).toMatchObject({ enabled: true, connected: false });

    const { url } = await (await call('/api/calendar/google/connect', { method: 'POST', body: {} })).json();
    expect(new URL(url).searchParams.get('redirect_uri')).toBe(CALLBACK);

    // Google sends the browser back: no cookie is needed, the signed state is the proof
    const saved = cookie;
    cookie = '';
    const back = await call(`/api/calendar/google/callback?code=abc&state=${encodeURIComponent(new URL(url).searchParams.get('state'))}`);
    cookie = saved;
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe(`${ORIGIN}/spacehank?tab=calendar&google=connected`);

    expect(await (await call('/api/calendar/status')).json()).toMatchObject({ connected: true, email: 'me@example.com' });
    const events = await (await call('/api/calendar/events?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z')).json();
    expect(events.events.map((e) => e.title)).toEqual(['Dentist']);

    // the briefing now reads the same calendar
    const briefing = await (await call('/api/briefing/calendar?from=2026-11-10T08:00:00Z&to=2026-11-10T12:00:00Z')).json();
    expect(briefing).toMatchObject({ configured: true, events: [{ title: 'Dentist' }] });
  });

  it('sends a bad or refused sign-in back to the app with a reason', async () => {
    const bad = await call('/api/calendar/google/callback?code=abc&state=forged.state.value');
    expect(bad.headers.get('location')).toBe(`${ORIGIN}/spacehank?tab=calendar&google=failed`);
    const denied = await call('/api/calendar/google/callback?error=access_denied');
    expect(denied.headers.get('location')).toBe(`${ORIGIN}/spacehank?tab=calendar&google=denied`);
  });

  it('refuses a change from another origin', async () => {
    expect((await call('/api/calendar/events/create', { method: 'POST', body: {}, origin: 'https://evil.example' })).status).toBe(403);
  });

  it('disconnects', async () => {
    expect(await (await call('/api/calendar/google/disconnect', { method: 'POST', body: {} })).json()).toEqual({ connected: false });
    expect(await (await call('/api/calendar/status')).json()).toMatchObject({ connected: false });
  });
});

describe('without Google set up', () => {
  it('says so, and the briefing stays on the secret feed', async () => {
    const app = createApp(loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN }), { fetchImpl: fakeGoogle });
    const base = `http://127.0.0.1:${await app.listen(0)}`;
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ password: PASSWORD }) });
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const get = (path, method = 'GET') => fetch(`${base}${path}`, { method, headers: { Cookie: cookie, Origin: ORIGIN, 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    expect(await (await get('/api/calendar/status')).json()).toMatchObject({ enabled: false, connected: false });
    expect((await get('/api/calendar/google/connect', 'POST')).status).toBe(503);
    expect(await (await get('/api/briefing/calendar?from=2026-11-01T00:00:00Z&to=2026-11-02T00:00:00Z')).json()).toEqual({ configured: false, events: [] });
    await app.close();
  });
});
