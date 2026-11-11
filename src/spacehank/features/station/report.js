// The station's report: who was given what, who is on what now and for how long, what each one finished or failed, and how
// busy the crew has been hour by hour, all read from the event log (newest first, as the server keeps it). Plain functions,
// tested in report.test.js.

import { CORE, handoffsIn, taskTitle } from './model';

const HOUR = 60 * 60 * 1000;

/** An event's time in ms, or null when it has none (an ISO string or a number, as the server or the app wrote it). */
export const timeOf = (event) => {
  const at = event?.at;
  if (at == null || at === '') return null;
  const ms = typeof at === 'number' ? at : Date.parse(at);
  return Number.isFinite(ms) ? ms : null;
};

const blank = (id) => ({ id, given: 0, done: 0, failed: 0, updates: 0, current: null, last: null, durations: [], from: {} });

/**
 * Each crew member's part, and the whole crew's. `crew` gives the order and who is working right now (their status is the
 * truth for that; the log may have lost the start of a long task).
 */
export const crewReport = (events, crew, now = Date.now()) => {
  const ids = crew.map((a) => a.id);
  const by = Object.fromEntries(ids.map((id) => [id, blank(id)]));
  const oldestFirst = [...(events ?? [])].reverse();

  for (const event of oldestFirst) {
    const at = timeOf(event);
    const [handoff] = handoffsIn([event], ids);
    if (handoff) {
      const row = by[handoff.to];
      row.given += 1;
      row.from[handoff.from] = (row.from[handoff.from] ?? 0) + 1;
      row.current = { title: handoff.text, since: at, updates: 0, from: handoff.from };
      row.last = { action: 'started', text: handoff.text, at };
      continue;
    }
    const row = by[event?.agentId ?? event?.agent];
    if (!row) continue;
    const text = taskTitle(event.text);
    if (event.action === 'output' || event.action === 'warning') {
      row.updates += 1;
      if (row.current) row.current.updates += 1;
    } else if (event.action === 'completed' || event.action === 'failed') {
      row[event.action === 'completed' ? 'done' : 'failed'] += 1;
      if (event.action === 'completed' && row.current?.since != null && at != null && at >= row.current.since) row.durations.push(at - row.current.since);
      row.current = null;
    } else continue;
    row.last = { action: event.action, text, at };
  }

  const rows = crew.map((agent) => {
    const row = by[agent.id];
    const working = !['idle', 'offline', 'completed', 'failed'].includes(agent.status);
    // working by the server's word but the log has no start: the task is what the server says it is
    const current = working ? (row.current ?? { title: agent.task, since: null, updates: 0, from: CORE }) : null;
    const avgMs = row.durations.length ? row.durations.reduce((a, b) => a + b, 0) / row.durations.length : null;
    return { ...row, agent, working, current, elapsedMs: current?.since != null ? Math.max(0, now - current.since) : null, avgMs };
  });

  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  const finished = sum('done') + sum('failed');
  const allDurations = rows.flatMap((row) => row.durations);
  const busiest = [...rows].sort((a, b) => b.given + b.done - (a.given + a.done))[0];
  return {
    rows,
    totals: {
      given: sum('given'),
      done: sum('done'),
      failed: sum('failed'),
      updates: sum('updates'),
      working: rows.filter((row) => row.working).length,
      idle: rows.filter((row) => !row.working && row.agent.status !== 'offline').length,
      offline: rows.filter((row) => row.agent.status === 'offline').length,
      successRate: finished ? sum('done') / finished : null,
      avgMs: allDurations.length ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : null,
      busiest: busiest && busiest.given + busiest.done > 0 ? busiest.agent : null,
    },
    hours: hourly(events, now),
  };
};

/** The last `count` hours, oldest first: how many tasks were given and how many finished in each. */
export const hourly = (events, now = Date.now(), count = 12) => {
  const end = Math.floor(now / HOUR) * HOUR + HOUR;
  const buckets = Array.from({ length: count }, (_, i) => ({ start: end - (count - i) * HOUR, given: 0, done: 0, failed: 0 }));
  for (const event of events ?? []) {
    const at = timeOf(event);
    if (at == null || at < buckets[0].start || at >= end) continue;
    const bucket = buckets[Math.floor((at - buckets[0].start) / HOUR)];
    if (['started', 'delegated', 'assigned'].includes(event.action)) bucket.given += 1;
    else if (event.action === 'completed') bucket.done += 1;
    else if (event.action === 'failed') bucket.failed += 1;
  }
  return buckets;
};

/** "45 s", "12 min", "1 h 05" for a span in ms. */
export const span = (ms) => {
  if (ms == null) return '–';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
