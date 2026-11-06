import { tr } from '../lang';
// The study planner as plain functions. A course keeps `exams` and `deadlines`: [{ id, title, at, done?, priority?, steps? }].
// `steps` are small checklist items: [{ id, text, done }]. These functions only read and rebuild that data.

const DAY = 86400000;

export const PRIORITIES = [
  { id: 'high', label: 'High' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
];
const RANK = { high: 0, normal: 1, low: 2 };

export const dayStart = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Every exam and deadline of every course as one list: [{ ...item, kind: 'exam' | 'deadline', course }]. */
export const flatten = (courses) =>
  courses.flatMap((course) => [
    ...(course.exams ?? []).map((e) => ({ ...e, kind: 'exam', done: false, course })),
    ...(course.deadlines ?? []).map((d) => ({ ...d, kind: 'deadline', done: Boolean(d.done), course })),
  ]);

/** Where a date falls from today: 'overdue', 'today', 'tomorrow', 'week' (within a week), or 'later'. */
export const bucketOf = (at, now = Date.now()) => {
  const days = Math.round((dayStart(at) - dayStart(now)) / DAY);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return days <= 7 ? 'week' : 'later';
};

export const BUCKETS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: tr('This week') },
  { id: 'later', label: 'Later' },
];

/** Soonest first; on the same day the more important first. */
const byDue = (a, b) => a.at - b.at || RANK[a.priority ?? 'normal'] - RANK[b.priority ?? 'normal'];

/**
 * The agenda: what is still to do, grouped by when. Exams that were yesterday or earlier drop off. `done` holds the
 * finished deadlines, latest first.
 */
export const agenda = (courses, now = Date.now()) => {
  const all = flatten(courses);
  const open = all.filter((item) => !item.done && (item.kind === 'deadline' || dayStart(item.at) >= dayStart(now)));
  const groups = BUCKETS.map((bucket) => ({ ...bucket, items: open.filter((item) => bucketOf(item.at, now) === bucket.id).sort(byDue) })).filter((group) => group.items.length);
  const done = all.filter((item) => item.done).sort((a, b) => b.at - a.at);
  return { groups, done, open: open.length };
};

/** The few numbers at the top: overdue, due today, due in the next seven days, and flashcards due. */
export const weekSummary = (courses, cards, now = Date.now()) => {
  const { groups } = agenda(courses, now);
  const count = (...ids) => groups.filter((g) => ids.includes(g.id)).reduce((n, g) => n + g.items.length, 0);
  return { overdue: count('overdue'), today: count('today'), week: count('today', 'tomorrow', 'week'), cardsDue: cards.filter((c) => c.due <= now).length };
};

/** How far a checklist has got: { done, total, pct }. */
export const stepsProgress = (item) => {
  const steps = item.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, pct: steps.length ? Math.round((done / steps.length) * 100) : 0 };
};

/** How much of a course is finished: the share of its deadlines that are done, or null when it has none. */
export const courseProgress = (course) => {
  const list = course.deadlines ?? [];
  if (!list.length) return null;
  return Math.round((list.filter((d) => d.done).length / list.length) * 100);
};

/** The items of one course for a board column: what is still to do soonest first, then what is done. */
export const columnItems = (course, now = Date.now()) => {
  const items = flatten([course]).filter((item) => item.kind === 'deadline' || dayStart(item.at) >= dayStart(now) - DAY);
  return [...items.filter((i) => !i.done).sort(byDue), ...items.filter((i) => i.done).sort((a, b) => b.at - a.at)];
};

const LIST = { exam: 'exams', deadline: 'deadlines' };
export const listOf = (kind) => LIST[kind];

/** A fresh item. */
export const newItem = ({ title, at, kind = 'deadline', priority = 'normal' }) => ({
  id: crypto.randomUUID(),
  title: String(title).trim().slice(0, 80),
  at,
  priority,
  steps: [],
  ...(kind === 'deadline' ? { done: false } : {}),
});

/** A new step for a checklist. */
export const newStep = (text) => ({ id: crypto.randomUUID(), text: String(text).trim().slice(0, 100), done: false });

const without = (list, id) => (list ?? []).filter((x) => x.id !== id);
const sorted = (list) => [...list].sort((a, b) => a.at - b.at);

/**
 * The course updates that save an item: the item is put in `to`'s list for its kind (replacing the same id), and taken out of
 * wherever it was before. Returns [{ id, patch }], one per course that changes. Pure.
 */
export const saveItem = (courses, item, { kind, courseId }) => {
  const patches = new Map();
  const patchOf = (course) => patches.get(course.id) ?? { exams: [...(course.exams ?? [])], deadlines: [...(course.deadlines ?? [])] };
  // out of every list that holds it (it may have changed kind or course)
  for (const course of courses) {
    const holds = (course.exams ?? []).some((x) => x.id === item.id) || (course.deadlines ?? []).some((x) => x.id === item.id);
    if (!holds) continue;
    const patch = patchOf(course);
    patch.exams = without(patch.exams, item.id);
    patch.deadlines = without(patch.deadlines, item.id);
    patches.set(course.id, patch);
  }
  const target = courses.find((c) => c.id === courseId);
  if (!target) return [];
  const patch = patchOf(target);
  const key = LIST[kind];
  const { done: _done, ...exam } = item; // an exam has no "done"
  const clean = kind === 'deadline' ? { ...item, done: Boolean(item.done) } : exam;
  patch[key] = sorted([...patch[key], clean]);
  patches.set(target.id, patch);
  return [...patches].map(([id, patch2]) => ({ id, patch: patch2 }));
};

/** The course updates that delete an item. Pure. */
export const deleteItem = (courses, id) =>
  courses
    .filter((c) => (c.exams ?? []).some((x) => x.id === id) || (c.deadlines ?? []).some((x) => x.id === id))
    .map((c) => ({ id: c.id, patch: { exams: without(c.exams, id), deadlines: without(c.deadlines, id) } }));

const pad = (n) => String(n).padStart(2, '0');

/** A date input's "2026-11-05" as a moment (9 in the morning of that day). */
export const atOfInput = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 9).getTime();
};

/** A moment as a date input's "2026-11-05". */
export const inputOfAt = (at) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
