import { describe, expect, it } from 'vitest';
import { CORE } from './model';
import { crewReport, hourly, span, timeOf } from './report';

const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const min = (m) => NOW - m * 60000;
const crew = [
  { id: 'codex', name: 'Minh Codex', status: 'working', task: 'Fix the login' },
  { id: 'nova', name: 'Linh Nova', status: 'idle', task: 'Waiting' },
  { id: 'atlas', name: 'Huy Atlas', status: 'offline', task: '' },
  { id: 'mira', name: 'Mira Core', status: 'working', task: 'Watch the deploy' },
];

// newest first, as the server keeps them
const events = [
  { id: '9', agent: 'codex', action: 'output', text: 'tests green', at: min(2) },
  { id: '8', agent: 'codex', action: 'started', text: 'Minh Codex accepted “Fix the login”', at: min(10) },
  { id: '7', agent: 'nova', action: 'failed', text: 'no access', at: min(20) },
  { id: '6', agent: 'nova', action: 'started', from: 'mira', text: 'Draft the guide', at: min(30) },
  { id: '5', agent: 'nova', action: 'completed', text: 'done', at: min(40) },
  { id: '4', agent: 'nova', action: 'output', text: 'half way', at: min(50) },
  { id: '3', agent: 'nova', action: 'started', text: 'Write notes', at: min(60) },
  { id: '2', agent: 'ghost', action: 'started', text: 'x', at: min(61) },
];

describe('the crew report', () => {
  const report = crewReport(events, crew, NOW);
  const row = (id) => report.rows.find((r) => r.id === id);

  it('counts what each one was given, finished and failed, and how long a finished task took', () => {
    expect(row('nova')).toMatchObject({ given: 2, done: 1, failed: 1, updates: 1, working: false, current: null });
    expect(row('nova').avgMs).toBe(20 * 60000);
    expect(row('nova').from).toEqual({ [CORE]: 1, mira: 1 });
    expect(row('nova').last).toMatchObject({ action: 'failed', text: 'no access' });
  });

  it('says who is on what now, since when and with how many updates', () => {
    expect(row('codex').current).toMatchObject({ title: 'Fix the login', since: min(10), updates: 1, from: CORE });
    expect(row('codex').elapsedMs).toBe(10 * 60000);
    // working by the server's word with no start in the log: its task, with no time
    expect(row('mira').current).toMatchObject({ title: 'Watch the deploy', since: null });
    expect(row('mira').elapsedMs).toBeNull();
  });

  it('adds it up for the whole crew', () => {
    expect(report.totals).toMatchObject({ given: 3, done: 1, failed: 1, working: 2, idle: 1, offline: 1, successRate: 0.5 });
    expect(report.totals.busiest.id).toBe('nova');
    expect(report.rows.map((r) => r.id)).toEqual(['codex', 'nova', 'atlas', 'mira']);
  });

  it('copes with an empty log', () => {
    const empty = crewReport([], crew, NOW);
    expect(empty.totals).toMatchObject({ given: 0, done: 0, successRate: null, avgMs: null, busiest: null });
  });
});

describe('hours', () => {
  it('buckets the last twelve hours, oldest first', () => {
    const hours = hourly(events, NOW);
    expect(hours).toHaveLength(12);
    const total = hours.reduce((n, h) => ({ given: n.given + h.given, done: n.done + h.done, failed: n.failed + h.failed }), { given: 0, done: 0, failed: 0 });
    expect(total).toEqual({ given: 4, done: 1, failed: 1 }); // the ghost's start counts as given too: it happened
    expect(hours.at(-1).start).toBeLessThanOrEqual(NOW);
  });
});

describe('times', () => {
  it('reads ISO strings and numbers, and words a span', () => {
    expect(timeOf({ at: '2026-11-11T12:00:00Z' })).toBe(NOW);
    expect(timeOf({ at: NOW })).toBe(NOW);
    expect(timeOf({})).toBeNull();
    expect([span(45000), span(12 * 60000), span(65 * 60000), span(null)]).toEqual(['45 s', '12 min', '1 h 05', '–']);
  });
});
