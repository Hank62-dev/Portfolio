import { tr } from '../lang.js';
import { excerpt, strip, titleOf, searchNotes } from '../notes/notes.js';
import { categoryOf, dayOf, formatVnd, inMonth, monthKey, summarize } from '../wallet/model.js';
import { streak, rate, dayKey } from '../habits/model.js';
import { agenda } from '../study/planner.js';
import { searchEvents } from '../calendar/model.js';

// Search and questions across everything the person keeps (notes, tasks, spending, voice memos, habits, study), not just
// notes. Plain functions: they read data that is already on the device.

const fold = (text) => strip(text);

const words = (query) => fold(query).split(/[^a-z0-9]+/).filter((w) => w.length > 1 || /\d/.test(w));

// every word of the query must be in the text (starts of words count: "plan" finds "planning")
const hits = (text, terms) => {
  if (!terms.length) return false;
  const have = fold(text);
  return terms.every((t) => have.includes(t));
};

/**
 * Finds what matches `query` in every kind of data: [{ id, kind, title, hint, tab, open? }], at most `limit`.
 * `kind` is note | task | spending | memo | habit | study | event. `open` is the id to open inside the tab, for notes.
 */
export const searchEverything = ({ notes = [], cards = [], entries = [], memos = [], habits = [], courses = [], events = [] }, query, limit = 10) => {
  const terms = words(query);
  if (!terms.length) return [];
  const out = [];

  for (const { note } of searchNotes(notes, query, 5)) {
    out.push({ id: `note-${note.id}`, kind: 'note', title: titleOf(note.text) || tr('Untitled'), hint: excerpt(note.text, query, 60), tab: note.day ? 'diary' : 'notes', open: note.day ? undefined : note.id });
  }
  for (const c of cards) {
    if (hits(`${c.title} ${c.notes ?? ''} ${(c.labels ?? []).join(' ')}`, terms)) out.push({ id: `task-${c.id}`, kind: 'task', title: c.title, hint: c.column === 'done' ? tr('Done') : c.due ? tr('Due {0}', c.due) : tr('Task'), tab: 'missions' });
  }
  for (const e of entries) {
    if (hits(`${e.note ?? ''} ${categoryOf(e.category).label}`, terms)) out.push({ id: `spend-${e.id}`, kind: 'spending', title: `${e.note || categoryOf(e.category).label}: ${formatVnd(e.amount)}`, hint: new Date(e.at).toLocaleDateString(), tab: 'wallet' });
  }
  for (const m of memos) {
    if (hits(`${m.title ?? ''} ${m.transcript ?? ''}`, terms)) out.push({ id: `memo-${m.id}`, kind: 'memo', title: m.title || tr('Voice memo'), hint: excerpt(m.transcript ?? '', query, 60), tab: 'memos' });
  }
  for (const h of habits) {
    if (hits(h.name, terms)) out.push({ id: `habit-${h.id}`, kind: 'habit', title: h.name, hint: tr('Habit'), tab: 'habits' });
  }
  for (const c of courses) {
    const found = hits(c.name, terms) ? c.name : [...(c.exams ?? []), ...(c.deadlines ?? [])].find((i) => hits(i.title, terms))?.title;
    if (found) out.push({ id: `study-${c.id}`, kind: 'study', title: found, hint: c.name, tab: 'study' });
  }
  for (const event of searchEvents(events, query, 4)) {
    const day = event.allDay ? event.start : new Date(event.start).toLocaleString();
    out.push({ id: `event-${event.calendarId}-${event.id}`, kind: 'event', title: event.title || tr('Untitled'), hint: day, tab: 'calendar' });
  }
  return out.slice(0, limit);
};

/** A question sounds like one: a few words that end with ? or start with a question word. */
export const looksLikeQuestion = (text) => {
  const t = String(text ?? '').trim();
  if (t.split(/\s+/).length < 3) return false;
  return /\?\s*$/.test(t) || /^(what|when|where|why|how|which|who|did|do|does|am|is|are|have|summar|bao nhiêu|bao nhieu|khi nào|khi nao|ở đâu|o dau|tại sao|vì sao|như thế nào|thế nào|có|tháng|tuần|mấy|đã|còn|tóm tắt|tổng)/i.test(t);
};

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Facts about the person's data as a few short "notes" the AI can answer from ([{ title, text }], at most 8): a summary of
 * open tasks, of this month's and last month's spending, of habits and of study deadlines, then the notes and memos that
 * match the question. Nothing leaves the device until the person asks a question.
 */
export const lifeDocs = ({ notes = [], cards = [], entries = [], memos = [], habits = [], courses = [], events = [] }, question, now = new Date()) => {
  const docs = [];
  const open = cards.filter((c) => c.column !== 'done' && !c.sample);
  if (open.length) docs.push({ title: tr('Open tasks'), text: clip(open.map((c) => `- ${c.title}${c.due ? ` (due ${c.due})` : ''} [${c.column}]`).join('\n'), 1700) });

  const real = entries.filter((e) => !e.sample);
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lines = [];
  for (const key of [monthKey(now), monthKey(last)]) {
    const month = inMonth(real, key);
    if (!month.length) continue;
    const s = summarize(month);
    lines.push(`${key}: spent ${formatVnd(s.spent)}, income ${formatVnd(s.income)}; by category: ${s.byCategory.map((c) => `${categoryOf(c.category).label} ${formatVnd(c.total)}`).join(', ') || 'none'}`);
  }
  const recent = real.slice(0, 15).map((e) => `- ${dayOf(e.at)} ${e.type} ${formatVnd(e.amount)} ${categoryOf(e.category).label} ${e.note ?? ''}`.trim());
  if (lines.length) docs.push({ title: tr('Spending'), text: clip([...lines, 'Latest lines:', ...recent].join('\n'), 1700) });

  const liveHabits = habits.filter((h) => !h.sample);
  if (liveHabits.length) docs.push({ title: tr('Habits'), text: clip(liveHabits.map((h) => `- ${h.name}: streak ${streak(h.days, now)} days, ${rate(h.days, 30, now)}% of the last 30 days${h.days.includes(dayKey(now)) ? ', done today' : ''}`).join('\n'), 1700) });

  const due = agenda(courses, now.getTime());
  if (due.open) docs.push({ title: tr('Study deadlines'), text: clip(due.groups.map((g) => `${g.label}: ${g.items.map((i) => `${i.title} (${i.course?.name ?? ''})`).join('; ')}`).join('\n'), 1700) });

  const coming = events.filter((e) => Date.parse(e.allDay ? `${e.end}T00:00:00` : e.end) > now.getTime()).slice(0, 15);
  if (coming.length) docs.push({ title: tr('Calendar'), text: clip(coming.map((e) => `- ${e.allDay ? e.start : new Date(e.start).toLocaleString()}: ${e.title}${e.location ? ` @ ${e.location}` : ''}`).join('\n'), 1700) });

  const terms = words(question).slice(0, 4);
  const matching = [
    ...searchNotes(notes, question, 3).map(({ note }) => ({ title: titleOf(note.text) || tr('Note'), text: String(note.text).slice(0, 1700) })),
    ...memos.filter((m) => m.transcript && hits(`${m.title ?? ''} ${m.transcript}`, terms)).slice(0, 2).map((m) => ({ title: m.title || tr('Voice memo'), text: String(m.transcript).slice(0, 1700) })),
  ];
  return [...docs, ...matching].slice(0, 8);
};
