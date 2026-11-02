// The Mission Board as plain data: columns, moving a card between them, due dates and checklist progress.

export const COLUMNS = [
  { id: 'backlog', label: 'Backlog', hint: 'Ideas and things to do' },
  { id: 'agent', label: 'With an agent', hint: 'Handed to an AI teammate' },
  { id: 'doing', label: 'In progress', hint: 'Being worked on' },
  { id: 'done', label: 'Done', hint: 'Finished' },
];

export const newCard = (title, column = 'backlog', order = 0) => ({
  title: String(title).trim().slice(0, 140),
  notes: '',
  column,
  order,
  due: '',
  labels: [],
  checklist: [],
  agent: '',
});

/** The cards of one column, in order. */
export const inColumn = (cards, column) => cards.filter((c) => c.column === column).sort((a, b) => a.order - b.order);

/**
 * Moves a card to `column` at position `index` (counted among that column's other cards) and renumbers the
 * columns it touched, so `order` stays 0, 1, 2… Returns the cards that changed (what to save).
 */
export const moveCard = (cards, id, column, index) => {
  const card = cards.find((c) => c.id === id);
  if (!card) return [];
  const source = inColumn(cards, card.column).filter((c) => c.id !== id);
  const target = card.column === column ? source : inColumn(cards, column).filter((c) => c.id !== id);
  const at = Math.max(0, Math.min(index, target.length));
  target.splice(at, 0, { ...card, column });

  const changed = [];
  const renumber = (list, col) =>
    list.forEach((c, i) => {
      const original = cards.find((x) => x.id === c.id);
      if (!original || original.order !== i || original.column !== col) changed.push({ ...c, column: col, order: i });
    });
  renumber(target, column);
  if (card.column !== column) renumber(source, card.column);
  return changed;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysUntil = (due, now) => {
  const [y, m, d] = due.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(now)) / 86400000);
};

/** How a due date (YYYY-MM-DD) stands today: overdue, today, soon (within two days) or later; null for no date. */
export const dueState = (due, now = new Date()) => {
  if (!due) return null;
  const days = daysUntil(due, now);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return days <= 2 ? 'soon' : 'later';
};

export const dueLabel = (due, now = new Date()) => {
  if (!due) return '';
  const days = daysUntil(due, now);
  const [y, m, d] = due.split('-').map(Number);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${-days} days ago`;
  if (days < 7) return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const progress = (checklist = []) => {
  const done = checklist.filter((i) => i.done).length;
  return { done, total: checklist.length, pct: checklist.length ? Math.round((done / checklist.length) * 100) : 0 };
};
