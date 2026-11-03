import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { rawStorage, setWriteHook, storage } from '../storage';
import { outboxOver, tablesOver } from './adapters';

// A real IndexedDB (an in-memory one), so the app's own storage code is what runs.

beforeEach(async () => {
  setWriteHook(null);
  await Promise.all([rawStorage.outbox.clear(), rawStorage.notes.clear(), rawStorage.photos.clear(), rawStorage.tracks.clear()]);
});

describe('the outbox', () => {
  it('keeps the record id apart from its own key', async () => {
    const outbox = outboxOver(rawStorage.outbox);
    await outbox.put({ key: 'notes:abc', store: 'notes', id: 'abc', deleted: false, at: 5 });
    await outbox.put({ key: 'photos:p1', store: 'photos', id: 'p1', deleted: true, at: 6 });
    const all = (await outbox.all()).sort((a, b) => a.at - b.at);
    expect(all).toEqual([
      { key: 'notes:abc', store: 'notes', id: 'abc', deleted: false, at: 5 },
      { key: 'photos:p1', store: 'photos', id: 'p1', deleted: true, at: 6 },
    ]);
  });

  it('replaces an older change to the same record, and removes by key', async () => {
    const outbox = outboxOver(rawStorage.outbox);
    await outbox.put({ key: 'notes:abc', store: 'notes', id: 'abc', deleted: false, at: 5 });
    await outbox.put({ key: 'notes:abc', store: 'notes', id: 'abc', deleted: true, at: 9 });
    expect(await outbox.all()).toHaveLength(1);
    expect((await outbox.all())[0]).toMatchObject({ deleted: true, at: 9 });
    await outbox.remove('notes:abc');
    expect(await outbox.all()).toEqual([]);
  });
});

describe('the write hook', () => {
  it('hears about writes and deletes to synced stores', async () => {
    const heard = [];
    setWriteHook((store, id, deleted) => heard.push([store, id, deleted]));
    await storage.notes.put({ id: 'n1', text: 'a', updatedAt: 1 });
    await storage.photos.put({ id: 'p1', blob: new Blob(['x']), updatedAt: 1 });
    await storage.notes.remove('n1');
    expect(heard).toEqual([['notes', 'n1', false], ['photos', 'p1', false], ['notes', 'n1', true]]);
  });

  it('says nothing about the music library, which is not synced', async () => {
    const heard = [];
    setWriteHook((...args) => heard.push(args));
    await storage.tracks.put({ id: 't1', title: 'x' });
    await storage.tracks.remove('t1');
    expect(heard).toEqual([]);
  });

  it('does not hear the engine: writes through the raw tables are silent', async () => {
    const heard = [];
    setWriteHook((...args) => heard.push(args));
    const tables = tablesOver(rawStorage);
    await tables.put('notes', { id: 'n2', text: 'from another device', updatedAt: 3 });
    expect(await tables.get('notes', 'n2')).toMatchObject({ text: 'from another device' });
    expect(await tables.all('notes')).toHaveLength(1);
    await tables.remove('notes', 'n2');
    expect(await tables.get('notes', 'n2')).toBeUndefined();
    expect(heard).toEqual([]);
  });

  it('does nothing when no engine is listening', async () => {
    setWriteHook(null);
    await expect(storage.notes.put({ id: 'n3', text: 'x', updatedAt: 1 })).resolves.not.toThrow();
  });
});
