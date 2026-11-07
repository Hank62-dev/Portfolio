import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { rawStorage } from '../storage';
import { addManyToInbox, addToInbox, fileItem } from './file';
import { inbox } from './store';
import { missions } from '../missions/store';
import { entries } from '../wallet/store';
import { notesStore, loadNotes } from '../notes/library';
import { bodyOf } from '../diary/model';
import { dayKey } from '../habits/model';

// The real stores (an in-memory IndexedDB): what is captured really lands in the Inbox, and filing really makes the thing.

beforeEach(async () => {
  await Promise.all([rawStorage.inbox.clear(), rawStorage.tasks.clear(), rawStorage.expenses.clear(), rawStorage.notes.clear()]);
  for (const c of [inbox, missions, entries]) c.store.set({ loaded: false, items: [] });
  notesStore.set({ loaded: false, notes: [] });
});

describe('capturing', () => {
  it('keeps a line in the Inbox with the guess made about it', async () => {
    const item = await addToInbox('  ăn trưa 45k  ');
    expect(item).toMatchObject({ text: 'ăn trưa 45k', kind: 'expense', amount: 45000, category: 'food', source: 'typed' });
    expect(await rawStorage.inbox.all()).toHaveLength(1);
  });

  it('ignores an empty line', async () => {
    expect(await addToInbox('   ')).toBeNull();
    expect(await rawStorage.inbox.all()).toHaveLength(0);
  });

  it('keeps what the AI split out, each with its own kind', async () => {
    await addManyToInbox([{ kind: 'task', title: 'Pay rent', due: '2026-11-10' }, { kind: 'expense', title: 'Coffee', amount: 30000, category: 'food' }], 'voice');
    const all = await rawStorage.inbox.all();
    expect(all.map((i) => [i.kind, i.source]).sort()).toEqual([['expense', 'voice'], ['task', 'voice']]);
    expect(all.find((i) => i.kind === 'task').due).toBe('2026-11-10');
  });
});

describe('filing', () => {
  it('files a task onto the board with its due date, and clears it from the Inbox', async () => {
    const item = await addToInbox('nộp báo cáo mai');
    const done = await fileItem(item);
    expect(done.tab).toBe('missions');
    const cards = await rawStorage.tasks.all();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ column: 'backlog' });
    expect(cards[0].due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await rawStorage.inbox.all()).toHaveLength(0);
  });

  it('files spending into the Wallet, and income as income', async () => {
    await fileItem(await addToInbox('cà phê 30k'));
    await fileItem(await addToInbox('nhận lương 6tr'));
    const lines = (await rawStorage.expenses.all()).sort((a, b) => a.amount - b.amount);
    expect(lines).toMatchObject([{ type: 'expense', amount: 30000, category: 'food' }, { type: 'income', amount: 6000000, category: 'income' }]);
  });

  it('will not file spending that has no amount, and leaves it in the Inbox', async () => {
    const item = await addToInbox('một ý tưởng');
    await expect(fileItem(item, 'expense')).rejects.toThrow();
    expect(await rawStorage.inbox.all()).toHaveLength(1);
    expect(await rawStorage.expenses.all()).toHaveLength(0);
  });

  it('can file the same line as a note', async () => {
    const item = await addToInbox('an idea for the landing page');
    await fileItem(item, 'note');
    const notes = await rawStorage.notes.all();
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toBe('an idea for the landing page');
  });

  it("adds to today's diary page, and keeps what was already there", async () => {
    await fileItem(await addToInbox('Hôm nay mình thấy nhẹ nhõm'), 'diary');
    await loadNotes();
    await fileItem(await addToInbox('Chiều đi dạo bên sông'), 'diary');
    const pages = (await rawStorage.notes.all()).filter((n) => n.day === dayKey());
    expect(pages).toHaveLength(1);
    expect(bodyOf(pages[0].text)).toBe('Hôm nay mình thấy nhẹ nhõm\n\nChiều đi dạo bên sông');
  });
});
