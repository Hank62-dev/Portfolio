import { describe, expect, it, vi } from 'vitest';
import { activeRepos, healthTone, loadGithub, ping, runTone, timeAgo } from './github';

const NOW = Date.UTC(2026, 10, 2, 12);

describe('timeAgo', () => {
  it('words a gap in minutes, hours and days', () => {
    const ago = (ms) => timeAgo(new Date(NOW - ms).toISOString(), NOW);
    expect([ago(20000), ago(5 * 60000), ago(3 * 3600000), ago(26 * 3600000), ago(5 * 86400000)]).toEqual(['just now', '5 min ago', '3 h ago', 'yesterday', '5 days ago']);
  });
});

describe('tones', () => {
  it('reads a workflow run', () => {
    expect(runTone(null).label).toBe('No runs');
    expect(runTone({ status: 'in_progress' })).toEqual({ tone: 'warn', label: 'Running' });
    expect(runTone({ status: 'completed', conclusion: 'success' }).tone).toBe('ok');
    expect(runTone({ status: 'completed', conclusion: 'failure' }).tone).toBe('danger');
    expect(runTone({ status: 'completed', conclusion: 'cancelled' }).tone).toBe('neutral');
  });
  it('reads a service check', () => {
    expect(healthTone({ ok: false, ms: 10 }).label).toBe('Down');
    expect(healthTone({ ok: true, ms: 2200 }).label).toBe('Slow');
    expect(healthTone({ ok: true, ms: 120 }).label).toBe('Healthy');
  });
});

describe('ping', () => {
  it('times a good answer and reports a failed one as down', async () => {
    let t = 0;
    const clock = () => (t += 40);
    expect(await ping('https://x.test', { fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 }), now: clock })).toEqual({ ok: true, ms: 40, status: 200 });
    expect((await ping('https://x.test', { fetchImpl: vi.fn().mockRejectedValue(new Error('net')), now: clock })).ok).toBe(false);
    expect((await ping('https://x.test', { fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 503 }), now: clock })).ok).toBe(false);
  });
  it('treats any answer to a no-cors request as up', async () => {
    expect((await ping('https://x.test', { cors: false, fetchImpl: vi.fn().mockResolvedValue({ type: 'opaque' }) })).ok).toBe(true);
  });
});

describe('loadGithub', () => {
  const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  const fetchImpl = vi.fn(async (url) => {
    if (url.includes('/repos?')) return json([{ name: 'a', html_url: 'u', fork: false, pushed_at: '2026-11-01T00:00:00Z' }, { name: 'forked', fork: true }, { name: 'b', html_url: 'u2', fork: false }]);
    if (url.includes('/commits')) return json([{ sha: 'abcdef123', html_url: 'c', commit: { message: 'fix: a thing\n\nbody', author: { date: '2026-11-01T00:00:00Z' } } }]);
    return json({ workflow_runs: [{ status: 'completed', conclusion: 'success', html_url: 'r' }] });
  });
  const memory = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  };

  it('lists the newest own repositories with commits and a run, and caches the result', async () => {
    const storage = memory();
    const data = await loadGithub({ user: 'me', fetchImpl, storage, now: () => 1000 });
    expect(data.map((r) => r.name)).toEqual(['a', 'b']);
    expect(data[0].commits[0]).toMatchObject({ sha: 'abcdef1', message: 'fix: a thing' });
    expect(data[0].run).toMatchObject({ conclusion: 'success' });
    const calls = fetchImpl.mock.calls.length;
    await loadGithub({ user: 'me', fetchImpl, storage, now: () => 2000 });
    expect(fetchImpl.mock.calls.length).toBe(calls);
  });

  it("puts first the repositories the person was last active in (anyone's), then fills with their own", async () => {
    const events = [
      { type: 'PushEvent', repo: { name: 'org/tool' }, created_at: '2026-11-02T10:00:00Z' },
      { type: 'WatchEvent', repo: { name: 'big/starred' }, created_at: '2026-11-02T09:00:00Z' },
      { type: 'PullRequestEvent', repo: { name: 'org/tool' }, created_at: '2026-11-01T10:00:00Z' },
      { type: 'IssueCommentEvent', repo: { name: 'me/a' }, created_at: '2026-11-01T08:00:00Z' },
    ];
    const urls = [];
    const fetch2 = vi.fn(async (url) => {
      urls.push(url);
      if (url.includes('/events/public')) return json(events);
      if (url.endsWith('/repos/org/tool')) return json({ name: 'tool', full_name: 'org/tool', html_url: 't', fork: false, pushed_at: '2026-11-02T11:00:00Z' });
      if (url.endsWith('/repos/me/a')) return json({ name: 'a', full_name: 'me/a', html_url: 'u', fork: false });
      if (url.includes('/repos?')) return json([{ name: 'a', full_name: 'me/a', fork: false }, { name: 'b', full_name: 'me/b', fork: false }, { name: 'c', full_name: 'me/c', fork: false }]);
      if (url.includes('/commits')) return json([]);
      return json({ workflow_runs: [] });
    });
    const data = await loadGithub({ user: 'me', limit: 3, fetchImpl: fetch2, storage: memory() });
    expect(data.map((r) => [r.full, r.own])).toEqual([['org/tool', false], ['me/a', true], ['me/b', true]]);
    expect(data[0].pushed).toBe('2026-11-02T10:00:00Z'); // when the person was active there, not anyone's last push
    expect(urls).toContain('https://api.github.com/repos/org/tool/commits?per_page=3&author=me'); // only their commits in someone else's repo
    expect(activeRepos(events).map((r) => r.full)).toEqual(['org/tool', 'me/a']);
  });

  it('explains a rate limit', async () => {
    await expect(loadGithub({ user: 'me', fetchImpl: async () => json({}, 403), storage: memory() })).rejects.toThrow(/limiting requests/);
  });
});
