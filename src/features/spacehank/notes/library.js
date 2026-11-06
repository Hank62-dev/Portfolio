import { createStore } from '../store';
import { storage } from '../storage';
import { onSynced } from '../sync/events';
import { dayKey, journalTemplate, textToHtml } from './notes';
import { tr } from '../lang';

// Notes live in this browser's IndexedDB, like the music. A note is { id, text, createdAt, updatedAt, pinned,
// day?, mood? }: `day` marks a journal entry, `mood` is 1 to 5.

export const notesStore = createStore({ loaded: false, notes: [], error: '' });

const order = (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt;

export const loadNotes = async () => {
  if (notesStore.get().loaded) return;
  try {
    notesStore.set({ loaded: true, notes: (await storage.notes.all()).sort(order), error: '' });
  } catch {
    notesStore.set({ loaded: true, error: tr('This browser would not open its private storage, so notes cannot be kept.') });
  }
};

// another device changed the notes: read them again
onSynced((stores) => {
  if (!stores.includes('notes') || !notesStore.get().loaded) return;
  storage.notes
    .all()
    .then((notes) => notesStore.set({ notes: notes.sort(order) }))
    .catch(() => {});
});

const put = async (note) => {
  await storage.notes.put(note);
  notesStore.set((s) => ({ notes: [...s.notes.filter((n) => n.id !== note.id), note].sort(order) }));
  return note;
};

export const createNote = (text = '', extra = {}) => {
  const now = Date.now();
  return put({ id: crypto.randomUUID(), text, createdAt: now, updatedAt: now, pinned: false, ...extra });
};

export const updateNote = async (id, patch) => {
  const current = notesStore.get().notes.find((n) => n.id === id);
  if (current) await put({ ...current, ...patch, updatedAt: Date.now() });
};

export const togglePin = async (id) => {
  const current = notesStore.get().notes.find((n) => n.id === id);
  if (current) await put({ ...current, pinned: !current.pinned });
};

export const deleteNote = async (id) => {
  await storage.notes.remove(id);
  notesStore.set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
};

/** Today's journal entry: opens it if it exists, writes the starting page if it does not. */
export const openJournal = async (date = new Date()) => {
  await loadNotes();
  const day = dayKey(date);
  return notesStore.get().notes.find((n) => n.day === day) ?? createNote(journalTemplate(date), { day, html: textToHtml(journalTemplate(date)) });
};

/** Everything as one JSON file, for a backup or a move to another browser. */
export const exportNotes = () => JSON.stringify({ app: 'hank62', kind: 'notes', exportedAt: new Date().toISOString(), notes: notesStore.get().notes }, null, 2);

/** Reads an export back, keeping notes that are already here (same id wins by the newer edit). Returns how many were added. */
export const importNotes = async (json) => {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error(tr('That file is not a notes export.'));
  }
  if (data?.kind !== 'notes' || !Array.isArray(data.notes)) throw new Error(tr('That file is not a notes export.'));
  let added = 0;
  for (const raw of data.notes) {
    if (typeof raw?.id !== 'string' || typeof raw.text !== 'string') continue;
    const have = notesStore.get().notes.find((n) => n.id === raw.id);
    if (have && have.updatedAt >= (raw.updatedAt ?? 0)) continue;
    await put({ pinned: false, createdAt: Date.now(), updatedAt: Date.now(), ...raw });
    if (!have) added += 1;
  }
  return added;
};

// A request from elsewhere (the command palette) for the notes tab or the studio to do something on arrival.
export const intents = createStore({ notes: null, studio: null });
export const sendIntent = (target, payload) => intents.set({ [target]: { ...payload, nonce: Date.now() + Math.random() } });
