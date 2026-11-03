import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const PASSWORD = 'correct horse battery staple';
const ORIGIN = 'https://workspace.example';

const env = { SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN, SYNC_MAX_BLOB_MB: '1' };

describe('sync routes, with a database', () => {
  let app;
  let base;
  let cookie;

  const call = (path, { method = 'GET', body, headers = {}, raw } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: { Origin: ORIGIN, ...(raw ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });

  beforeAll(async () => {
    app = createApp(loadConfig(env), { db: new PGlite() });
    base = `http://127.0.0.1:${await app.listen(0)}`;
    const login = await call('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
    cookie = login.headers.getSetCookie()[0].split(';')[0];
  });
  afterAll(() => app.close());

  it('is closed to anyone who is not signed in', async () => {
    const saved = cookie;
    cookie = '';
    for (const [path, method] of [['/api/sync/status', 'GET'], ['/api/sync/pull', 'GET'], ['/api/sync/push', 'POST'], ['/api/sync/blob?store=photos&id=x', 'GET'], ['/api/sync/blob?store=photos&id=x', 'PUT']]) {
      expect((await call(path, { method, body: method === 'POST' ? { changes: [] } : undefined })).status, `${method} ${path}`).toBe(401);
    }
    cookie = saved;
  });

  it('refuses a change from another origin', async () => {
    const res = await fetch(`${base}/api/sync/push`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', Cookie: cookie }, body: JSON.stringify({ changes: [] }) });
    expect(res.status).toBe(403);
  });

  it('says it is on, and how much is used', async () => {
    const status = await (await call('/api/sync/status')).json();
    expect(status).toMatchObject({ enabled: true, records: 0, files: 0 });
    expect(status.quotaBytes).toBeGreaterThan(0);
  });

  it('takes a push and gives the same records to a pull', async () => {
    const push = await call('/api/sync/push', { method: 'POST', body: { changes: [{ store: 'habits', id: 'h1', doc: { id: 'h1', name: 'Read', updatedAt: 10 }, updatedAt: 10 }] } });
    expect(push.status).toBe(200);
    expect(await push.json()).toMatchObject({ applied: 1 });
    const pulled = await (await call('/api/sync/pull?since=0')).json();
    expect(pulled.changes).toHaveLength(1);
    expect(pulled.changes[0]).toMatchObject({ store: 'habits', id: 'h1', doc: { name: 'Read' } });
    expect((await (await call(`/api/sync/pull?since=${pulled.cursor}`)).json()).changes).toEqual([]);
  });

  it('answers a bad change with a plain error, not a crash', async () => {
    const res = await call('/api/sync/push', { method: 'POST', body: { changes: [{ store: 'tracks', id: 'x', doc: {}, updatedAt: 1 }] } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown store/);
    expect((await call('/api/sync/push', { method: 'POST', body: {} })).status).toBe(400);
  });

  it('stores and returns a picture byte for byte, and refuses one that is too big', async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const put = await call('/api/sync/blob?store=photos&id=p1&at=5', { method: 'PUT', raw: bytes, headers: { 'Content-Type': 'image/jpeg' } });
    expect(put.status).toBe(200);
    const got = await call('/api/sync/blob?store=photos&id=p1');
    expect(got.status).toBe(200);
    expect(got.headers.get('content-type')).toBe('image/jpeg');
    expect(got.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect([...new Uint8Array(await got.arrayBuffer())]).toEqual([...bytes]);
    const big = await call('/api/sync/blob?store=photos&id=p2&at=5', { method: 'PUT', raw: new Uint8Array(1024 * 1024 + 10), headers: { 'Content-Type': 'image/jpeg' } });
    expect(big.status).toBe(413);
    expect((await call('/api/sync/blob?store=photos&id=missing')).status).toBe(404);
    expect((await call('/api/sync/blob?store=notes&id=n', { method: 'PUT', raw: bytes })).status).toBe(400);
  });

  it('allows PUT in the CORS preflight', async () => {
    const res = await fetch(`${base}/api/sync/blob`, { method: 'OPTIONS', headers: { Origin: ORIGIN } });
    expect(res.headers.get('access-control-allow-methods')).toContain('PUT');
  });

  it('tells the other devices on the socket that something changed', async () => {
    const socket = new WebSocket(`${base.replace('http', 'ws')}`, { headers: { Origin: ORIGIN, Cookie: cookie } });
    const messages = [];
    socket.on('message', (data) => messages.push(JSON.parse(data)));
    await new Promise((resolve) => socket.on('open', resolve));
    await new Promise((resolve) => setTimeout(resolve, 150));
    await call('/api/sync/push', { method: 'POST', body: { changes: [{ store: 'notes', id: 'n9', doc: { id: 'n9', text: 'x', updatedAt: 50 }, updatedAt: 50 }] } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    socket.close();
    expect(messages.some((m) => m.type === 'sync')).toBe(true);
  });

  it('does not tell anyone when a push changed nothing', async () => {
    const socket = new WebSocket(`${base.replace('http', 'ws')}`, { headers: { Origin: ORIGIN, Cookie: cookie } });
    const messages = [];
    socket.on('message', (data) => messages.push(JSON.parse(data)));
    await new Promise((resolve) => socket.on('open', resolve));
    await new Promise((resolve) => setTimeout(resolve, 150));
    await call('/api/sync/push', { method: 'POST', body: { changes: [{ store: 'notes', id: 'n9', doc: { id: 'n9', text: 'older', updatedAt: 1 }, updatedAt: 1 }] } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    socket.close();
    expect(messages.some((m) => m.type === 'sync')).toBe(false);
  });
});

describe('sync routes, with no database', () => {
  let app;
  let base;
  let cookie;
  beforeAll(async () => {
    app = createApp(loadConfig(env));
    base = `http://127.0.0.1:${await app.listen(0)}`;
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ password: PASSWORD }) });
    cookie = login.headers.getSetCookie()[0].split(';')[0];
  });
  afterAll(() => app.close());

  it('says sync is off and explains how to switch it on', async () => {
    const headers = { Origin: ORIGIN, Cookie: cookie };
    expect(await (await fetch(`${base}/api/sync/status`, { headers })).json()).toEqual({ enabled: false });
    const pull = await fetch(`${base}/api/sync/pull?since=0`, { headers });
    expect(pull.status).toBe(503);
    expect((await pull.json()).error).toMatch(/DATABASE_URL/);
  });
});
