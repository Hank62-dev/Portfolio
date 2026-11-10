import { dayKey } from '../notes/notes';

// What the Focus timer has done over time, as plain functions. The log is a list of finished focus sessions,
// { at, minutes }, oldest first; everything the screens show (today, the week, the streak) is worked out from it.

export const LOG_LIMIT = 2000; // about two years of a few sessions a day

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/** The log with one more finished session on the end, never longer than LOG_LIMIT. */
export const addSession = (log, minutes, at = Date.now()) => [...log, { at, minutes: Math.max(1, Math.round(minutes)) }].slice(-LOG_LIMIT);

/** Reads a saved log back, dropping anything that is not a session. */
export const parseLog = (raw) => {
  try {
    const list = JSON.parse(raw ?? '[]');
    return Array.isArray(list) ? list.filter((s) => Number.isFinite(s?.at) && Number.isFinite(s?.minutes) && s.minutes > 0) : [];
  } catch {
    return [];
  }
};

/** Minutes and sessions per day: Map of 'YYYY-MM-DD' -> { minutes, sessions }. */
export const byDay = (log) => {
  const days = new Map();
  for (const { at, minutes } of log) {
    const key = dayKey(new Date(at));
    const day = days.get(key) ?? { minutes: 0, sessions: 0 };
    days.set(key, { minutes: day.minutes + minutes, sessions: day.sessions + 1 });
  }
  return days;
};

/** Days in a row with at least one session, ending today (or yesterday, if today has none yet). */
export const streakOf = (days, today = new Date()) => {
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
};

/** The longest run of consecutive days with a session, ever. */
export const bestStreak = (days) => {
  const sorted = [...days.keys()].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of sorted) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    run = previous && dayKey(addDays(previous, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
};

/** "2h 10m", "45m", "0m". */
export const hoursMinutes = (minutes) => {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  return h ? `${h}h ${String(total % 60).padStart(2, '0')}m` : `${total}m`;
};

/** Everything the Focus screen and the morning briefing show. `week` is the last seven days, oldest first. */
export const summarize = (log, now = new Date()) => {
  const days = byDay(log);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i - 6);
    const day = days.get(dayKey(date));
    return { day: dayKey(date), weekday: date.getDay(), minutes: day?.minutes ?? 0, sessions: day?.sessions ?? 0 };
  });
  const today = days.get(dayKey(now)) ?? { minutes: 0, sessions: 0 };
  return {
    today,
    week,
    weekMinutes: week.reduce((sum, d) => sum + d.minutes, 0),
    streak: streakOf(days, now),
    best: bestStreak(days),
    totalMinutes: log.reduce((sum, s) => sum + s.minutes, 0),
    totalSessions: log.length,
  };
};

/** A believable fortnight of sessions for the demo: a few days a week, ending with a run of days in a row. */
export const sampleLog = (now = new Date()) => {
  const plan = [0, 2, 3, 0, 4, 2, 3, 0, 2, 4, 3, 2, 3, 2]; // sessions per day, oldest first, last is today
  const log = [];
  plan.forEach((count, i) => {
    const day = addDays(now, i - (plan.length - 1));
    for (let k = 0; k < count; k += 1) {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9 + k * 2, 10 + k * 7).getTime();
      if (at <= now.getTime()) log.push({ at, minutes: 25 });
    }
  });
  return log;
};
