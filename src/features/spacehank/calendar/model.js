import { dayKey } from '../habits/model.js';
import { flatten } from '../study/planner.js';

// The Calendar as plain functions: the days of a month or a week, what falls on each day (events from Google, the deadlines and
// exams of the Study Hub, tasks with a date, tasks waiting in the Inbox), and the agenda that groups what is coming by when.
// Days are written "2026-11-08" in the person's own time zone. Nothing here reads or saves anything.

const MAX_SPAN_DAYS = 31;
const pad = (n) => String(n).padStart(2, '0');

/** "2026-11-08" as a date at local midnight. */
export const parseDay = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The day `n` days from a day (negative: before). */
export const addDays = (key, n) => {
  const d = parseDay(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** Whole days from one day to another. */
export const daysBetween = (from, to) => Math.round((parseDay(to) - parseDay(from)) / 86400000);

/** The first day of the month that holds a day. */
export const monthOf = (key) => `${key.slice(0, 7)}-01`;

/** The Monday of the week that holds a day. */
export const weekStart = (key) => {
  const d = parseDay(key);
  return addDays(key, -((d.getDay() + 6) % 7));
};

/** The seven days of the week that holds a day, Monday first. */
export const weekOf = (key) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(key), i));

/** The six weeks that show a month, Monday first: [{ key, inMonth }] (42 days). */
export const monthGrid = (key) => {
  const first = monthOf(key);
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => {
    const day = addDays(start, i);
    return { key: day, inMonth: day.slice(0, 7) === first.slice(0, 7) };
  });
};

/** The month before or after (the 1st of it). */
export const shiftMonth = (key, n) => {
  const d = parseDay(monthOf(key));
  return dayKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

/** The time span a view needs events for: [from, to) as dates. */
export const rangeOf = (view, anchor, today = dayKey()) => {
  if (view === 'month') {
    const grid = monthGrid(anchor);
    return { from: parseDay(grid[0].key), to: parseDay(addDays(grid[41].key, 1)) };
  }
  if (view === 'week') return { from: parseDay(weekStart(anchor)), to: parseDay(addDays(weekStart(anchor), 7)) };
  // the agenda looks ahead
  return { from: parseDay(today), to: parseDay(addDays(today, 60)) };
};

/** "09:30" for a moment, in the person's time zone. */
export const clockOf = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const hueColour = (hue) => `hsl(${hue} 62% 62%)`;

/**
 * Events from Google as items on days. An event over several days is one item on each day it touches (`part` says which
 * of how many), so a day only has to look at its own items.
 */
export const googleItems = (events = []) =>
  events.flatMap((event) => {
    let first;
    let last;
    let startMs = null;
    let endMs = null;
    if (event.allDay) {
      first = event.start;
      last = addDays(event.end, -1);
      if (last < first) last = first;
    } else {
      startMs = Date.parse(event.start);
      endMs = Date.parse(event.end);
      if (!Number.isFinite(startMs)) return [];
      first = dayKey(new Date(startMs));
      // an event that ends exactly at midnight does not touch the next day
      last = Number.isFinite(endMs) && endMs > startMs ? dayKey(new Date(endMs - 1)) : first;
    }
    const count = Math.min(MAX_SPAN_DAYS, daysBetween(first, last) + 1);
    return Array.from({ length: count }, (_, index) => ({
      uid: `g:${event.calendarId}:${event.id}:${index}`,
      source: 'google',
      day: addDays(first, index),
      title: event.title || '',
      allDay: event.allDay || count > 1,
      startMs: event.allDay ? null : startMs,
      endMs: event.allDay ? null : endMs,
      color: event.color || 'var(--color-signal)',
      done: false,
      part: { index, count },
      event,
    }));
  });

/**
 * What the person keeps on their own device that has a date: the deadlines and exams of the Study Hub, tasks of the Mission
 * Board with a due date, and tasks waiting in the Inbox with one. Done things are kept (they are drawn struck through).
 */
export const localItems = ({ courses = [], cards = [], inbox = [] } = {}) => {
  const study = flatten(courses).map((item) => ({
    uid: `s:${item.id}`,
    source: 'study',
    day: dayKey(new Date(item.at)),
    title: item.title,
    sub: item.course?.code || item.course?.name || '',
    kind: item.kind,
    allDay: true,
    startMs: null,
    endMs: null,
    color: hueColour(item.course?.hue ?? 265),
    done: Boolean(item.done),
    ref: item,
  }));
  const tasks = cards
    .filter((card) => card.due && /^\d{4}-\d{2}-\d{2}$/.test(card.due) && !card.sample)
    .map((card) => ({ uid: `t:${card.id}`, source: 'task', day: card.due, title: card.title, sub: '', allDay: true, startMs: null, endMs: null, color: hueColour(196), done: card.column === 'done', ref: card }));
  const waiting = inbox
    .filter((item) => item.kind === 'task' && /^\d{4}-\d{2}-\d{2}$/.test(item.due ?? ''))
    .map((item) => ({ uid: `i:${item.id}`, source: 'inbox', day: item.due, title: item.text, sub: '', allDay: true, startMs: null, endMs: null, color: hueColour(30), done: false, ref: item }));
  return [...study, ...tasks, ...waiting];
};

const bySource = { google: 0, study: 1, task: 2, inbox: 3 };

/** Within a day: things with no time first, then by the time of day. */
export const inDayOrder = (a, b) => {
  const timedA = a.allDay ? 0 : 1;
  const timedB = b.allDay ? 0 : 1;
  return timedA - timedB || (a.startMs ?? 0) - (b.startMs ?? 0) || bySource[a.source] - bySource[b.source] || a.title.localeCompare(b.title);
};

/** Items grouped by day: Map(day -> items in the order of the day). */
export const byDay = (items) => {
  const days = new Map();
  for (const item of items) {
    if (!days.has(item.day)) days.set(item.day, []);
    days.get(item.day).push(item);
  }
  for (const list of days.values()) list.sort(inDayOrder);
  return days;
};

/** The few dots under a day number: one colour for each kind of thing on it (at most three). */
export const dots = (items) => {
  const seen = new Map();
  for (const item of items) if (!item.done && !seen.has(item.source === 'google' ? item.color : item.source)) seen.set(item.source === 'google' ? item.color : item.source, item.color);
  return [...seen.values()].slice(0, 3);
};

/** The next events from Google that have not ended: soonest first, an event over several days only on its first day (and today). */
export const upcoming = (items, now = Date.now(), limit = 4) => {
  const today = dayKey(new Date(now));
  return items
    .filter((item) => item.source === 'google' && item.day >= today && !(item.part?.index > 0 && item.day !== today) && (item.allDay ? true : item.endMs > now))
    .sort((a, b) => a.day.localeCompare(b.day) || inDayOrder(a, b))
    .slice(0, limit);
};

const GROUPS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'This week' },
  { id: 'later', label: 'Later' },
];

/** Where a day falls from today. */
export const groupOf = (day, today) => {
  const n = daysBetween(today, day);
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return n <= 7 ? 'week' : 'later';
};

/**
 * The agenda: what is coming, grouped by when. Overdue holds only things that can be late (a deadline, a task), never an
 * event that has passed. Done things are left out; an event over several days shows on its first day, and on today.
 */
export const agendaGroups = (items, today = dayKey()) => {
  const live = items.filter((item) => {
    if (item.done) return false;
    if (item.day < today) return item.source !== 'google';
    return !(item.part?.index > 0 && item.day !== today);
  });
  return GROUPS.map((group) => ({
    ...group,
    items: live.filter((item) => groupOf(item.day, today) === group.id).sort((a, b) => a.day.localeCompare(b.day) || inDayOrder(a, b)),
  })).filter((group) => group.items.length);
};

// ---- the form for an event

const dateOf = (ms) => dayKey(new Date(ms));

/** The values of the event form: a new event on `day`, or an existing one. */
export const draftOf = (event, day, now = new Date()) => {
  if (!event) {
    const hour = Math.min(22, now.getHours() + 1);
    return { title: '', allDay: false, date: day, startTime: `${pad(hour)}:00`, endDate: day, endTime: `${pad(hour + 1 > 23 ? 23 : hour + 1)}:00`, location: '', description: '', repeat: 'none', calendarId: '' };
  }
  if (event.allDay) {
    const last = addDays(event.end, -1);
    return { title: event.title, allDay: true, date: event.start, startTime: '09:00', endDate: last < event.start ? event.start : last, endTime: '10:00', location: event.location, description: event.description, repeat: 'none', calendarId: event.calendarId };
  }
  const start = Date.parse(event.start);
  const end = Date.parse(event.end);
  return { title: event.title, allDay: false, date: dateOf(start), startTime: clockOf(start), endDate: dateOf(end), endTime: clockOf(end), location: event.location, description: event.description, repeat: 'none', calendarId: event.calendarId };
};

const momentOf = (day, time) => {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi).getTime();
};

/** What the server wants for an event, from the form. A form with no title, or no day, is not ready. */
export const inputOf = (draft, { zone } = {}) => {
  const base = { calendarId: draft.calendarId, title: draft.title.trim(), location: draft.location.trim(), description: draft.description.trim(), repeat: draft.repeat, timeZone: zone };
  if (draft.allDay) {
    const last = draft.endDate && draft.endDate >= draft.date ? draft.endDate : draft.date;
    return { ...base, allDay: true, start: draft.date, end: addDays(last, 1) }; // Google's end date is the day after the last
  }
  const start = momentOf(draft.date, draft.startTime);
  let end = momentOf(draft.endDate || draft.date, draft.endTime);
  if (!(end > start)) end = start + 60 * 60 * 1000;
  return { ...base, allDay: false, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
};

/** Whether the form can be saved. */
export const draftReady = (draft) => Boolean(draft.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && draft.calendarId);

/** Events that match a few words, for the search: soonest first. */
export const searchEvents = (events, question, limit = 5) => {
  const terms = String(question ?? '').toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return [];
  return events
    .filter((event) => {
      const text = `${event.title} ${event.location} ${event.description}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .slice(0, limit);
};
