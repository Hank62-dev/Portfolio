import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const ORIGIN = 'https://hank.example';
const PASSWORD = 'correct horse battery staple';

const RSS = '<rss><channel><title>Show</title><item><title>Ep 1</title><guid>g1</guid><enclosure url="https://cdn.example/1.mp3"/></item></channel></rss>';

describe('the podcast routes', () => {
  const get = vi.fn(async (url) => ({ status: 200, type: '', body: Buffer.from(url.includes('itunes') ? JSON.stringify({ results: [{ collectionName: 'Show', feedUrl: 'https://feed.example/rss' }] }) : RSS) }));
  let app;
  let base;
  let cookie;

  const call = (path) => fetch(`${base}${path}`, { headers: { Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) } });

  beforeAll(async () => {
    app = createApp(loadConfig({ SPACEHANK_PASSWORD: PASSWORD, SPACEHANK_ORIGIN: ORIGIN }), { podcastGet: get });
    base = `http://127.0.0.1:${await app.listen(0)}`;
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ password: PASSWORD }) });
    cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  });

  afterAll(() => app.close());

  it('are for the owner only', async () => {
    const saved = cookie;
    cookie = '';
    expect((await call('/api/podcasts/search?q=show')).status).toBe(401);
    expect((await call('/api/podcasts/feed?url=https://feed.example/rss')).status).toBe(401);
    cookie = saved;
  });

  it('search the directory and read a feed', async () => {
    const found = await (await call('/api/podcasts/search?q=show')).json();
    expect(found.results[0]).toMatchObject({ title: 'Show', feedUrl: 'https://feed.example/rss' });
    const feed = await (await call(`/api/podcasts/feed?url=${encodeURIComponent('https://feed.example/rss')}`)).json();
    expect(feed.show.title).toBe('Show');
    expect(feed.episodes).toEqual([expect.objectContaining({ guid: 'g1', title: 'Ep 1', audio: 'https://cdn.example/1.mp3' })]);
  });

  it('refuse a bad search or address with a 400, not a crash', async () => {
    expect((await call('/api/podcasts/search?q=a')).status).toBe(400);
    expect((await call('/api/podcasts/feed?url=file:///etc/passwd')).status).toBe(400);
    expect((await call('/api/podcasts/feed')).status).toBe(400);
  });
});
