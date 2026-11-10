import { locale, tr } from '../../core/i18n/lang.js';
import { categoryOf, formatVnd, summarize } from '../wallet/model.js';
import { dayKey, rate } from '../habits/model.js';
import { isWritten, entryOf } from '../diary/model.js';

// The weekly review as plain functions: the numbers of the last seven days, counted on the device, and a plain-words version
// of them for when the AI is not there. The AI only ever sees the numbers, never the notes themselves.

const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** The window: the seven days up to and including today. `from` is the first midnight, `prevFrom` the week before. */
export const weekWindow = (now = new Date()) => {
  const end = startOfDay(now) + DAY;
  return { from: end - 7 * DAY, to: end, prevFrom: end - 14 * DAY };
};

const within = (t, from, to) => t >= from && t < to;

/** The numbers of the last seven days. Sample data (the demo cards, habits and spending) never counts. */
export const weekStats = ({ cards = [], habits = [], entries = [], notes = [], memos = [], inbox = [] }, now = new Date()) => {
  const { from, to, prevFrom } = weekWindow(now);
  const real = (list) => list.filter((x) => !x.sample);
  const money = real(entries);
  const spendNow = summarize(money.filter((e) => within(e.at, from, to)));
  const spendBefore = summarize(money.filter((e) => within(e.at, prevFrom, from)));

  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(from + i * DAY + 3600000)));
  const liveHabits = real(habits);
  const habitRows = liveHabits.map((h) => ({ name: h.name, daysDone: days.filter((d) => h.days.includes(d)).length, rate30: rate(h.days, 30, now) }));
  const habitChecks = habitRows.reduce((n, h) => n + h.daysDone, 0);

  const done = real(cards).filter((c) => c.column === 'done' && within(c.updatedAt ?? 0, from, to));
  const open = real(cards).filter((c) => c.column !== 'done');
  const overdue = open.filter((c) => c.due && c.due < dayKey(now));

  const diaryDays = days.filter((d) => isWritten(entryOf(notes, d))).length;
  const moods = days.map((d) => entryOf(notes, d)?.mood).filter(Boolean);

  return {
    days: 7,
    tasksDone: done.length,
    tasksOpen: open.length,
    tasksOverdue: overdue.length,
    habits: habitRows.slice(0, 8),
    habitChecks,
    habitChecksPossible: liveHabits.length * 7,
    spent: spendNow.spent,
    spentBefore: spendBefore.spent,
    income: spendNow.income,
    topCategories: spendNow.byCategory.slice(0, 3).map((c) => ({ category: categoryOf(c.category).label, total: c.total })),
    notesWritten: real(notes).filter((n) => !n.day && within(n.createdAt ?? 0, from, to)).length,
    diaryDays,
    moodAverage: moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null,
    memos: real(memos).filter((m) => within(m.at ?? 0, from, to)).length,
    inboxWaiting: inbox.length,
  };
};

/**
 * The week day by day, oldest first (the seven days of the window): what the story draws as bars and dots. Kept apart from
 * `weekStats` because that is what is sent to the AI, and only totals go there.
 * [{ key, label, tasks, habitsDone, habitsTotal, spent, diary, mood }]
 */
export const weekDays = ({ cards = [], habits = [], entries = [], notes = [] }, now = new Date()) => {
  const { from } = weekWindow(now);
  const real = (list) => list.filter((x) => !x.sample);
  const liveHabits = real(habits);
  const money = real(entries);
  const done = real(cards).filter((c) => c.column === 'done');
  return Array.from({ length: 7 }, (_, i) => {
    const start = from + i * DAY;
    const date = new Date(start + 3600000);
    const key = dayKey(date);
    const entry = entryOf(notes, key);
    return {
      key,
      label: date.toLocaleDateString(locale(), { weekday: 'short' }),
      tasks: done.filter((c) => within(c.updatedAt ?? 0, start, start + DAY)).length,
      habitsDone: liveHabits.filter((h) => h.days.includes(key)).length,
      habitsTotal: liveHabits.length,
      spent: summarize(money.filter((e) => within(e.at, start, start + DAY))).spent,
      diary: isWritten(entry),
      mood: entry?.mood ?? null,
    };
  });
};

/** True when there is something to look back on at all. */
export const hasWeek = (stats) => stats.tasksDone + stats.habitChecks + stats.notesWritten + stats.diaryDays + stats.memos > 0 || stats.spent > 0 || stats.income > 0;

/** The numbers as a few lines of plain words (no AI), in the reader's language. */
export const weekLines = (s) => {
  const lines = [];
  lines.push(tr('Tasks finished: {0}. Still open: {1}{2}.', s.tasksDone, s.tasksOpen, s.tasksOverdue ? tr(' ({0} overdue)', s.tasksOverdue) : ''));
  if (s.habitChecksPossible) lines.push(tr('Habits: {0} of {1} check-ins.', s.habitChecks, s.habitChecksPossible));
  if (s.spent || s.income) {
    const diff = s.spentBefore ? Math.round(((s.spent - s.spentBefore) / s.spentBefore) * 100) : null;
    const trend = diff === null ? '' : diff > 0 ? tr(', {0}% more than the week before', diff) : diff < 0 ? tr(', {0}% less than the week before', -diff) : tr(', the same as the week before');
    lines.push(tr('Spent {0}{1}.', formatVnd(s.spent), trend));
    if (s.topCategories[0]) lines.push(tr('Most went on {0} ({1}).', s.topCategories[0].category, formatVnd(s.topCategories[0].total)));
  }
  if (s.diaryDays) lines.push(tr('You wrote in your diary on {0} of 7 days.', s.diaryDays));
  if (s.notesWritten || s.memos) lines.push(tr('New notes: {0}. Voice memos: {1}.', s.notesWritten, s.memos));
  return lines;
};

/** The ISO week label used as the title of a saved review, e.g. 2026-W45. */
export const weekLabel = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - first) / DAY + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
