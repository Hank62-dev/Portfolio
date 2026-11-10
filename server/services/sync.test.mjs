import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSync } from './sync.mjs';

// A real Postgres (in-process) so the SQL itself is what is tested.
let db;
let sync;
beforeEach(async () => {
  db = new PGlite();
  sync = createSync({ db, maxBlobBytes: 1000, quotaBytes: 5000 });
  await sync.init();
});

const change = (over = {}) => ({ store: 'notes', id: 'n1', doc: { id: 'n1', text: 'hello', updatedAt: 100 }, updatedAt: 100, ...over });

describe('pushing and pulling', () => {
  it('stores a record and hands it to another device', async () => {
    const result = await sync.push([change()]);
    expect(result).toMatchObject({ applied: 1, skipped: 0 });
    const pulled = await sync.pull(0);
    expect(pulled.changes).toHaveLength(1);
    expect(pulled.changes[0]).toMatchObject({ store: 'notes', id: 'n1', deleted: false, updatedAt: 100, doc: { text: 'hello' }, blob: null });
    expect(pulled.cursor).toBe(pulled.changes[0].seq);
    expect(pulled.more).toBe(false);
  });

  it('only returns what changed after the cursor', async () => {
    await sync.push([change()]);
    const first = await sync.pull(0);
    expect((await sync.pull(first.cursor)).changes).toEqual([]);
    await sync.push([change({ id: 'n2', doc: { id: 'n2', text: 'two' } })]);
    const next = await sync.pull(first.cursor);
    expect(next.changes.map((c) => c.id)).toEqual(['n2']);
  });

  it('keeps the newest edit: an older one arriving late is ignored', async () => {
    await sync.push([change({ doc: { text: 'new' }, updatedAt: 200 })]);
    const late = await sync.push([change({ doc: { text: 'old' }, updatedAt: 150 })]);
    expect(late).toMatchObject({ applied: 0, skipped: 1 });
    expect((await sync.pull(0)).changes[0].doc.text).toBe('new');
    expect(await sync.push([change({ doc: { text: 'newer' }, updatedAt: 300 })])).toMatchObject({ applied: 1 });
    expect((await sync.pull(0)).changes[0].doc.text).toBe('newer');
  });

  it('moves a changed record to the end of the log, so other devices see the change', async () => {
    await sync.push([change(), change({ id: 'n2', doc: { text: 'two' } })]);
    const before = await sync.pull(0);
    await sync.push([change({ doc: { text: 'edited' }, updatedAt: 500 })]);
    const after = await sync.pull(before.cursor);
    expect(after.changes.map((c) => [c.id, c.doc.text])).toEqual([['n1', 'edited']]);
  });

  it('pages through a long log', async () => {
    await sync.push(Array.from({ length: 5 }, (_, i) => change({ id: `n${i}`, doc: { text: `${i}` } })));
    const page = await sync.pull(0, 2);
    expect(page.changes).toHaveLength(2);
    expect(page.more).toBe(true);
    const rest = await sync.pull(page.cursor, 10);
    expect(rest.changes).toHaveLength(3);
    expect(rest.more).toBe(false);
  });
});

describe('deleting', () => {
  it('leaves a tombstone that reaches the other devices, and a newer edit can bring it back', async () => {
    await sync.push([change()]);
    const seen = await sync.pull(0);
    await sync.push([{ store: 'notes', id: 'n1', deleted: true, updatedAt: 200 }]);
    const gone = await sync.pull(seen.cursor);
    expect(gone.changes[0]).toMatchObject({ id: 'n1', deleted: true, doc: null });
    await sync.push([change({ doc: { text: 'back' }, updatedAt: 300 })]);
    expect((await sync.pull(0)).changes[0]).toMatchObject({ deleted: false, doc: { text: 'back' } });
  });

  it('ignores a delete that is older than the record', async () => {
    await sync.push([change({ updatedAt: 500 })]);
    expect(await sync.push([{ store: 'notes', id: 'n1', deleted: true, updatedAt: 100 }])).toMatchObject({ applied: 0 });
    expect((await sync.pull(0)).changes[0].deleted).toBe(false);
  });
});

describe('what is refused', () => {
  it('unknown stores, bad ids, bad times, bad documents and oversized ones', async () => {
    await expect(sync.push([change({ store: 'tracks' })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ store: '__proto__' })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ id: '' })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ id: 'x'.repeat(200) })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ updatedAt: 'soon' })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ doc: 'text' })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ doc: [1] })])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push([change({ doc: { text: 'x'.repeat(300 * 1024) } })])).rejects.toMatchObject({ status: 413 });
    await expect(sync.push([])).rejects.toMatchObject({ status: 400 });
    await expect(sync.push(Array.from({ length: 101 }, (_, i) => change({ id: `n${i}` })))).rejects.toMatchObject({ status: 400 });
  });

  it('does not let a quote or a statement in an id reach the SQL', async () => {
    await sync.push([change({ id: "n1'); DROP TABLE sync_docs;--" })]);
    expect((await sync.pull(0)).changes).toHaveLength(1);
  });
});

describe('pictures and recordings', () => {
  const photo = (over = {}) => ({ store: 'photos', id: 'p1', doc: { id: 'p1', mime: 'image/jpeg', at: 1 }, updatedAt: 1, ...over });

  it('stores a file beside its record and says so when the record is pulled', async () => {
    await sync.putBlob({ store: 'photos', id: 'p1', mime: 'image/jpeg', data: Buffer.from([1, 2, 3, 4]), updatedAt: 1 });
    await sync.push([photo()]);
    const pulled = await sync.pull(0);
    expect(pulled.changes[0].blob).toEqual({ mime: 'image/jpeg', size: 4 });
    const file = await sync.getBlob({ store: 'photos', id: 'p1' });
    expect(file.mime).toBe('image/jpeg');
    expect([...file.data]).toEqual([1, 2, 3, 4]);
  });

  it('removes the file when the record is deleted', async () => {
    await sync.putBlob({ store: 'photos', id: 'p1', mime: 'image/jpeg', data: Buffer.from([1]), updatedAt: 1 });
    await sync.push([photo(), { store: 'photos', id: 'p1', deleted: true, updatedAt: 5 }]);
    await expect(sync.getBlob({ store: 'photos', id: 'p1' })).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a file for a store that has none, an empty one, and one that is too big', async () => {
    await expect(sync.putBlob({ store: 'notes', id: 'n1', mime: 'x', data: Buffer.from([1]) })).rejects.toMatchObject({ status: 400 });
    await expect(sync.putBlob({ store: 'photos', id: 'p1', mime: 'x', data: Buffer.alloc(0) })).rejects.toMatchObject({ status: 400 });
    await expect(sync.putBlob({ store: 'photos', id: 'p1', mime: 'image/jpeg', data: Buffer.alloc(1001) })).rejects.toMatchObject({ status: 413, message: expect.stringContaining('this device only') });
  });

  it('stops when the storage would go over the quota, but lets a file be replaced', async () => {
    for (let i = 0; i < 5; i += 1) await sync.putBlob({ store: 'photos', id: `p${i}`, mime: 'image/jpeg', data: Buffer.alloc(900), updatedAt: 1 });
    await expect(sync.putBlob({ store: 'photos', id: 'p9', mime: 'image/jpeg', data: Buffer.alloc(900) })).rejects.toMatchObject({ status: 413, message: expect.stringContaining('full') });
    await expect(sync.putBlob({ store: 'photos', id: 'p0', mime: 'image/jpeg', data: Buffer.alloc(500) })).resolves.toMatchObject({ ok: true });
  });

  it('reports what is used', async () => {
    await sync.push([change(), change({ id: 'n2' })]);
    await sync.putBlob({ store: 'photos', id: 'p1', mime: 'image/jpeg', data: Buffer.alloc(100), updatedAt: 1 });
    const usage = await sync.usage();
    expect(usage).toMatchObject({ records: 2, files: 1, quotaBytes: 5000 });
    expect(usage.usedBytes).toBeGreaterThan(100);
  });
});

describe('starting up', () => {
  it('can be started twice on the same database', async () => {
    await expect(createSync({ db }).init()).resolves.toBeUndefined();
    await sync.push([change()]);
    await createSync({ db }).init();
    expect((await sync.pull(0)).changes).toHaveLength(1);
  });
});
