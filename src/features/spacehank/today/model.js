import { tr } from '../lang.js';
import { dueState } from '../missions/model.js';
import { agenda } from '../study/planner.js';
import { dayKey } from '../habits/model.js';
import { dayOf } from '../wallet/model.js';
import { entryOf, isWritten } from '../diary/model.js';

// "Today" as plain functions: from everything the person keeps, what needs them now. It reads data and returns numbers and
// short lists; the screen draws them.

const MAX_TASKS = 6;

/**
 * Open tasks that matter today: overdue first, then due today, then due in the next two days, then what is in progress
 * (without a date). Each: { id, title, state: 'overdue' | 'today' | 'soon' | 'doing', due }.
 */
export const tasksForToday = (cards, now = new Date()) => {
  const rank = { overdue: 0, today: 1, soon: 2, doing: 3 };
  return cards
    .filter((c) => c.column !== 'done' && !c.sample)
    .map((c) => {
      const state = dueState(c.due, now);
      return { id: c.id, title: c.title, due: c.due, state: state === 'overdue' || state === 'today' || state === 'soon' ? state : c.column === 'doing' ? 'doing' : null };
    })
    .filter((c) => c.state)
    .sort((a, b) => rank[a.state] - rank[b.state] || String(a.due || '9').localeCompare(String(b.due || '9')))
    .slice(0, MAX_TASKS);
};

/** Exams and deadlines that are overdue, today or tomorrow: [{ id, title, course, at, bucket }]. */
export const deadlinesForToday = (courses, now = Date.now()) =>
  agenda(courses, now)
    .groups.filter((g) => ['overdue', 'today', 'tomorrow'].includes(g.id))
    .flatMap((g) => g.items.map((item) => ({ id: item.id, title: item.title, course: item.course?.name ?? '', at: item.at, bucket: g.id, kind: item.kind })))
    .slice(0, 4);

/** Habits: how many are done today, and the ones still waiting. */
export const habitsForToday = (habits, now = new Date()) => {
  const key = dayKey(now);
  const live = habits.filter((h) => !h.sample);
  const pending = live.filter((h) => !h.days.includes(key));
  return { total: live.length, done: live.length - pending.length, pending };
};

/** What was spent today (money out only) and how many lines it took. */
export const spentToday = (entries, now = new Date()) => {
  const key = dayKey(now);
  const today = entries.filter((e) => e.type === 'expense' && !e.sample && dayOf(e.at) === key);
  return { total: today.reduce((n, e) => n + e.amount, 0), count: today.length };
};

/** What was spent on each of the last seven days (today last), oldest first: a list of seven numbers for a small chart. */
export const spendLast7 = (entries, now = new Date()) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    return dayKey(d);
  });
  const totals = new Map(days.map((d) => [d, 0]));
  for (const e of entries) {
    if (e.type !== 'expense' || e.sample) continue;
    const key = dayOf(e.at);
    if (totals.has(key)) totals.set(key, totals.get(key) + e.amount);
  }
  return days.map((d) => totals.get(d));
};

/**
 * One or two things Hank would nudge, as { id, text, tab }: the most pressing first. Never more than two, so the
 * screen stays calm.
 */
export const nudges = ({ tasks, deadlines, habits, inboxCount, diaryWritten, now = new Date() }) => {
  const list = [];
  const overdue = tasks.filter((t) => t.state === 'overdue').length + deadlines.filter((d) => d.bucket === 'overdue').length;
  if (overdue) list.push({ id: 'overdue', text: overdue === 1 ? tr('One thing is overdue. Do it first, or move its date.') : tr('{0} things are overdue. Pick the smallest and start there.', overdue), tab: 'missions' });
  if (inboxCount >= 3) list.push({ id: 'inbox', text: tr('{0} things are waiting in your Inbox. A minute of sorting clears your head.', inboxCount), tab: null });
  if (habits.total && habits.pending.length && now.getHours() >= 18) list.push({ id: 'habits', text: tr('It is evening and {0} habit(s) are not done yet.', habits.pending.length), tab: 'habits' });
  if (!diaryWritten && now.getHours() >= 20) list.push({ id: 'diary', text: tr('You have not written in your diary today. Two lines are enough.'), tab: 'diary' });
  return list.slice(0, 2);
};

/** Everything the Today screen shows, from the loaded data. */
export const buildToday = ({ cards = [], courses = [], habits = [], entries = [], inbox = [], notes = [], now = new Date() }) => {
  const tasks = tasksForToday(cards, now);
  const deadlines = deadlinesForToday(courses, now.getTime());
  const habitState = habitsForToday(habits, now);
  const diary = entryOf(notes, dayKey(now));
  const diaryWritten = isWritten(diary);
  return {
    tasks,
    deadlines,
    habits: habitState,
    spent: spentToday(entries, now),
    inboxCount: inbox.length,
    diaryWritten,
    nudges: nudges({ tasks, deadlines, habits: habitState, inboxCount: inbox.length, diaryWritten, now }),
  };
};
