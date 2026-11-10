import { tr } from '../../core/i18n/lang';
// Habit Garden as plain functions: streaks, how big a plant has grown, the heatmap, and what a habit does to your mood.
// A habit keeps `days`: the 'YYYY-MM-DD' strings on which it was done.

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const HABIT_ICONS = ['sprout', 'book', 'run', 'water', 'mind', 'write', 'music', 'sleep', 'walk', 'eat', 'ride', 'coffee'];

export const newHabit = (name, icon = 'sprout', hue = 140) => ({ name: String(name).trim().slice(0, 40), icon, hue, days: [] });

/** Toggles a day on or off, returning the new list of days. */
export const toggleDay = (days, day) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort());

/** Days in a row up to today (or up to yesterday, if today is not done yet). */
export const streak = (days, today = new Date()) => {
  const done = new Set(days);
  let cursor = done.has(dayKey(today)) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(dayKey(cursor))) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
};

export const longestStreak = (days) => {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    run = previous && dayKey(addDays(previous, 1)) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
};

/** Days since it was last done (0 when done today), or Infinity if never. */
export const daysSince = (days, today = new Date()) => {
  if (!days.length) return Infinity;
  const last = [...days].sort().pop();
  const [y, m, d] = last.split('-').map(Number);
  return Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(y, m - 1, d)) / 86400000);
};

export const STAGES = ['seed', 'sprout', 'seedling', 'plant', 'bloom', 'tree'];

/** How far the plant has grown (0 to 5), from the current streak; it wilts after more than two days missed. */
export const stageOf = (days, today = new Date()) => {
  const run = streak(days, today);
  const stage = run >= 30 ? 5 : run >= 14 ? 4 : run >= 7 ? 3 : run >= 3 ? 2 : run >= 1 ? 1 : 0;
  const missed = daysSince(days, today);
  return { stage, name: STAGES[stage], wilting: days.length > 0 && missed > 2, streak: run };
};

/** Share of the last `window` days on which the habit was done, 0 to 100. */
export const rate = (days, window = 30, today = new Date()) => {
  const done = new Set(days);
  let hits = 0;
  for (let i = 0; i < window; i += 1) if (done.has(dayKey(addDays(today, -i)))) hits += 1;
  return Math.round((hits / window) * 100);
};

/** The last `weeks` weeks as columns of 7 days (Monday first), oldest first: [{ day, done, future }]. */
export const heatmap = (days, weeks = 20, today = new Date()) => {
  const done = new Set(days);
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const start = addDays(monday, -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const key = dayKey(date);
      return { day: key, done: done.has(key), future: date > today };
    })
  );
};

/**
 * Do you feel better on the days you do it? The average journal mood on days done minus days not done; null if
 * either side has fewer than 3 days with a mood.
 */
export const moodLift = (days, moodByDay) => {
  const done = new Set(days);
  const withHabit = [];
  const without = [];
  for (const [day, mood] of Object.entries(moodByDay)) (done.has(day) ? withHabit : without).push(mood);
  if (withHabit.length < 3 || without.length < 3) return null;
  const mean = (a) => a.reduce((n, x) => n + x, 0) / a.length;
  return +(mean(withHabit) - mean(without)).toFixed(1);
};

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The last `length` days up to today, oldest first: [{ day, done, isToday, label }]. `label` is the weekday's first letter. */
export const weekStrip = (days, length = 7, today = new Date()) => {
  const done = new Set(days);
  return Array.from({ length }, (_, i) => {
    const date = addDays(today, i - (length - 1));
    const key = dayKey(date);
    return { day: key, done: done.has(key), isToday: i === length - 1, label: WEEKDAY[date.getDay()] };
  });
};

/** The whole garden over the last `length` days: how many habits were done each day, out of how many. */
export const gardenWeek = (habits, length = 7, today = new Date()) =>
  Array.from({ length }, (_, i) => {
    const date = addDays(today, i - (length - 1));
    const key = dayKey(date);
    return { day: key, isToday: i === length - 1, label: WEEKDAY[date.getDay()], done: habits.filter((h) => h.days.includes(key)).length, total: habits.length };
  });

const STAGE_AT = [0, 1, 3, 7, 14, 30];

/** The next thing the plant grows into, and how many more days in a row it takes; null for a full-grown tree. */
export const nextStage = (run) => {
  const index = STAGE_AT.findIndex((at) => run < at);
  return index === -1 ? null : { name: STAGES[index], left: STAGE_AT[index] - run, at: STAGE_AT[index] };
};

/** How far along the way to the next stage (0 to 1), for a progress bar. A full-grown tree is 1. */
export const stageProgress = (run) => {
  const index = STAGE_AT.findIndex((at) => run < at);
  if (index === -1) return 1;
  const from = STAGE_AT[index - 1] ?? 0;
  return (run - from) / (STAGE_AT[index] - from);
};

/** One line about how the garden is doing today. */
export const gardenLine = (done, total) => {
  if (total === 0) return tr('Plant your first habit to start the garden.');
  if (done === total) return tr('Every plant is watered. The garden is happy.');
  if (done === 0) return total === 1 ? tr('One plant is waiting for water.') : tr('Your plants are waiting for water.');
  const left = total - done;
  return tr('{0} more {1} water today.', left, left === 1 ? tr('plant needs') : tr('plants need'));
};

/** Habits in the order the list shows them: the ones still to do today first, then the done ones; each group keeps its own order. */
export const todoFirst = (habits, today = new Date()) => {
  const key = dayKey(today);
  const pending = habits.filter((h) => !h.days.includes(key));
  return [...pending, ...habits.filter((h) => h.days.includes(key))];
};
