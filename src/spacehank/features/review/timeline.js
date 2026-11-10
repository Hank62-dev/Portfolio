import { tr } from '../../core/i18n/lang.js';
import { titleOf } from '../notes/notes.js';
import { categoryOf, formatVnd } from '../wallet/model.js';
import { dayKey } from '../habits/model.js';
import { bodyOf } from '../diary/model.js';

// One day as a single line of time: the notes, diary page, voice memos, spending and finished tasks that belong to it, in
// order, plus the habits that were checked (which have a day but no time). It only reads data.

const dayOfTime = (t) => dayKey(new Date(t));

/**
 * Everything of `day` (YYYY-MM-DD): [{ id, at, kind, title, detail, tab }] oldest first, then `habits`: [name].
 * `kind` is note | diary | memo | spending | income | task.
 */
export const dayTimeline = ({ notes = [], memos = [], entries = [], cards = [], habits = [] }, day = dayKey()) => {
  const events = [];
  for (const n of notes) {
    if (n.sample) continue;
    if (n.day === day) {
      events.push({ id: `diary-${n.id}`, at: n.updatedAt ?? n.createdAt ?? 0, kind: 'diary', title: tr('Diary page'), detail: bodyOf(n.text).slice(0, 90), tab: 'diary' });
    } else if (!n.day && dayOfTime(n.createdAt ?? 0) === day) {
      events.push({ id: `note-${n.id}`, at: n.createdAt, kind: 'note', title: titleOf(n.text) || tr('Untitled'), detail: '', tab: 'notes' });
    }
  }
  for (const m of memos) {
    if (!m.sample && dayOfTime(m.at ?? 0) === day) events.push({ id: `memo-${m.id}`, at: m.at, kind: 'memo', title: m.title || tr('Voice memo'), detail: m.transcript ? String(m.transcript).slice(0, 90) : '', tab: 'memos' });
  }
  for (const e of entries) {
    if (!e.sample && dayOfTime(e.at ?? 0) === day) events.push({ id: `money-${e.id}`, at: e.at, kind: e.type === 'income' ? 'income' : 'spending', title: e.note || categoryOf(e.category).label, detail: `${e.type === 'income' ? '+' : '-'}${formatVnd(e.amount)}`, tab: 'wallet' });
  }
  for (const c of cards) {
    if (!c.sample && c.column === 'done' && dayOfTime(c.updatedAt ?? 0) === day) events.push({ id: `task-${c.id}`, at: c.updatedAt, kind: 'task', title: c.title, detail: tr('Done'), tab: 'missions' });
  }
  events.sort((a, b) => a.at - b.at);
  return { events, habits: habits.filter((h) => !h.sample && h.days.includes(day)).map((h) => h.name) };
};
