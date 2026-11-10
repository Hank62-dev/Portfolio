import { tr } from '../../core/i18n/lang';
import { missions } from '../missions/store';
import { newCard } from '../missions/model';
import { entries } from '../wallet/store';
import { categoryOf } from '../wallet/model';
import { createNote, loadNotes, notesStore } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { saveEntry } from '../diary/store';
import { bodyOf, entryOf } from '../diary/model';
import { dayKey } from '../habits/model';
import { inbox } from './store';
import { newInboxItem } from './model';

// Filing: turning an inbox item into the real thing (a card on the board, a spending line, a note, a line in today's diary).
// The tab it ended up in is returned, so a screen can offer to go there.

const atNoon = (day) => {
  const [y, m, d] = String(day).split('-').map(Number);
  return y ? new Date(y, m - 1, d, 12).getTime() : Date.now();
};

/** Files `item` as `kind` (its own guess by default) and takes it out of the Inbox. Returns { tab, label }. */
export const fileItem = async (item, kind = item.kind) => {
  const text = item.text.trim();
  let result;
  if (kind === 'task') {
    await missions.load();
    const cards = missions.store.get().items;
    await missions.create({ ...newCard(item.title || text, 'backlog', cards.filter((c) => c.column === 'backlog').length), due: item.due ?? '', notes: item.title && item.title !== text ? text : '' });
    result = { tab: 'missions', label: tr('Filed as a task') };
  } else if (kind === 'expense' || kind === 'income') {
    const amount = item.amount > 0 ? item.amount : 0;
    if (!amount) throw new Error(tr('I could not find an amount in that'));
    const category = kind === 'income' ? 'income' : categoryOf(item.category).id;
    await entries.create({ type: kind, amount, category, note: item.title || text, at: item.day ? atNoon(item.day) : Date.now() });
    result = { tab: 'wallet', label: kind === 'income' ? tr('Filed as income') : tr('Filed as spending') };
  } else if (kind === 'diary') {
    await loadNotes();
    const day = dayKey();
    const entry = entryOf(notesStore.get().notes, day);
    const body = [entry ? bodyOf(entry.text) : '', text].filter(Boolean).join('\n\n');
    await saveEntry({ day, entry, mood: entry?.mood, body, photos: entry?.photos ?? [] });
    result = { tab: 'diary', label: tr("Added to today's diary") };
  } else {
    await createNote(text, { html: textToHtml(text) });
    result = { tab: 'notes', label: tr('Saved as a note') };
  }
  await inbox.remove(item.id);
  return result;
};

/** Puts a line in the Inbox (guessing what it is unless told). Returns the saved item. */
export const addToInbox = async (text, options) => {
  const body = String(text ?? '').trim();
  if (!body) return null;
  await inbox.load();
  return inbox.create(newInboxItem(body, options));
};

/** Puts several things (the AI's split of one long text, say) in the Inbox: [{ kind, title, due, amount, category }]. */
export const addManyToInbox = async (items, source) => {
  await inbox.load();
  for (const guess of items) await inbox.create(newInboxItem(guess.title, { source, guess }));
  return items.length;
};
