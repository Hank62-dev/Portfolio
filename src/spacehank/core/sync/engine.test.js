import { Buffer } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSync } from '../../../../server/services/sync.mjs';
import { BLOB_FIELD, createEngine, decide, splitRecord, stampOf } from './engine';

// Two "devices" that keep their records in memory and talk to the real sync code on a real (in-process) Postgres.

let clock;
let server;
let calls;

const fileOf = (...bytes) => ({ type: 'image/jpeg', size: bytes.length, bytes: Uint8Array.from(bytes) });

const apiFor = (sync, hooks = {}) => ({
  push: async (changes) => {
    calls.push('push');
    await hooks.beforePush?.(changes);
    return sync.push(changes);
  },
  pull: async (since) => {
    calls.push('pull');
    await hooks.beforePull?.();
    return sync.pull(since, 3); // small pages, so paging is exercised
  },
  putBlob: async (store, id, blob, at) => {
    calls.push(`putBlob:${id}`);
    return sync.putBlob({ store, id, mime: blob.type, data: Buffer.from(blob.bytes), updatedAt: at });
  },
  getBlob: async (store, id) => {
    calls.push(`getBlob:${id}`);
    const f = await sync.getBlob({ store, id });
    return { type: f.mime, size: f.data.length, bytes: Uint8Array.from(f.data) };
  },
});

const device = (hooks) => {
  const records = new Map();
  const waiting = new Map();
  const kv = new Map();
  const statuses = [];
  const changed = [];
  const engine = createEngine({
    tables: {
      get: async (store, id) => records.get(`${store}:${id}`) ?? null,
      put: async (store, record) => void records.set(`${store}:${record.id}`, record),
      remove: async (store, id) => void records.delete(`${store}:${id}`),
      all: async (store) => [...records].filter(([k]) => k.startsWith(`${store}:`)).map(([, v]) => v),
    },
    outbox: {
      all: async () => [...waiting.values()],
      put: async (entry) => void waiting.set(entry.key, entry),
      remove: async (key) => void waiting.delete(key),
    },
    api: apiFor(server, hooks),
    meta: { get: (k) => kv.get(k) ?? null, set: (k, v) => void kv.set(k, v) },
    stores: ['notes', 'photos'],
    now: () => ++clock,
    onChange: (stores) => changed.push(stores),
    onStatus: (s) => statuses.push(s),
  });
  return {
    engine,
    waiting,
    statuses,
    changed,
    read: (store, id) => records.get(`${store}:${id}`),
    /** What the app does: write the record, and the storage hook queues it. */
    write: async (store, record) => {
      records.set(`${store}:${record.id}`, record);
      await engine.queue(store, record.id, false);
    },
    erase: async (store, id) => {
      records.delete(`${store}:${id}`);
      await engine.queue(store, id, true);
    },
    /** A record that was there before sync existed: no queue entry. */
    preexisting: (store, record) => void records.set(`${store}:${record.id}`, record),
  };
};

const note = (id, text, updatedAt) => ({ id, text, createdAt: 1, updatedAt: updatedAt ?? ++clock });

beforeEach(async () => {
  clock = 1000;
  calls = [];
  const db = new PGlite();
  server = createSync({ db, maxBlobBytes: 100, quotaBytes: 100000 });
  await server.init();
});

describe('two devices', () => {
  it('a note written on one appears on the other, and an edit comes back', async () => {
    const a = device();
    const b = device();
    await a.write('notes', note('n1', 'hello'));
    await a.engine.sync();
    await b.engine.sync();
    expect(b.read('notes', 'n1')).toMatchObject({ text: 'hello' });
    expect(b.changed.flat()).toContain('notes');

    await b.write('notes', note('n1', 'hello, edited on B'));
    await b.engine.sync();
    await a.engine.sync();
    expect(a.read('notes', 'n1').text).toBe('hello, edited on B');
  });

  it('a delete on one device reaches the other', async () => {
    const a = device();
    const b = device();
    await a.write('notes', note('n1', 'x'));
    await a.engine.sync();
    await b.engine.sync();
    await a.erase('notes', 'n1');
    await a.engine.sync();
    await b.engine.sync();
    expect(b.read('notes', 'n1')).toBeUndefined();
  });

  it('keeps working offline: changes wait in the outbox and go out together', async () => {
    const a = device();
    for (const id of ['a', 'b', 'c']) await a.write('notes', note(id, id));
    expect(a.waiting.size).toBe(3);
    const result = await a.engine.sync();
    expect(result.pushed).toBe(3);
    expect(a.waiting.size).toBe(0);
    const b = device();
    await b.engine.sync();
    expect(['a', 'b', 'c'].map((id) => b.read('notes', id)?.text)).toEqual(['a', 'b', 'c']);
  });

  it('pulls a long log page by page', async () => {
    const a = device();
    for (let i = 0; i < 8; i += 1) await a.write('notes', note(`n${i}`, `${i}`));
    await a.engine.sync();
    const b = device();
    await b.engine.sync();
    expect(calls.filter((c) => c === 'pull').length).toBeGreaterThanOrEqual(3);
    expect([...Array(8).keys()].every((i) => b.read('notes', `n${i}`))).toBe(true);
  });
});

describe('conflicts', () => {
  it('when both devices edit the same note, the later edit wins on both', async () => {
    const a = device();
    const b = device();
    await a.write('notes', note('n1', 'start', 100));
    await a.engine.sync();
    await b.engine.sync();
    await a.write('notes', note('n1', 'A edit', 200));
    await b.write('notes', note('n1', 'B edit, later', 300));
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    expect(a.read('notes', 'n1').text).toBe('B edit, later');
    expect(b.read('notes', 'n1').text).toBe('B edit, later');
  });

  it('a change this device has not sent yet is not overwritten by an older copy from the server', async () => {
    const a = device();
    const b = device();
    await a.write('notes', note('n1', 'old', 100));
    await a.engine.sync();
    await b.engine.sync();
    await b.write('notes', note('n1', 'newer, not sent yet', 500));
    await a.write('notes', note('n1', 'in between', 300));
    await a.engine.sync(); // the server now has "in between"
    await b.engine.sync(); // B pulls it, but its own edit is newer
    expect(b.read('notes', 'n1').text).toBe('newer, not sent yet');
    await a.engine.sync();
    expect(a.read('notes', 'n1').text).toBe('newer, not sent yet');
  });

  it('a delete does not beat a later edit made elsewhere', async () => {
    const a = device();
    const b = device();
    await a.write('notes', note('n1', 'x', 100));
    await a.engine.sync();
    await b.engine.sync();
    await a.erase('notes', 'n1'); // queued at clock time ~ 1000+
    await b.write('notes', note('n1', 'kept', 99999999));
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    expect(a.read('notes', 'n1')?.text).toBe('kept');
  });
});

describe('data that was here before sync', () => {
  it('is sent once, by the first round, and not again', async () => {
    const a = device();
    a.preexisting('notes', note('old1', 'from long ago', 50));
    a.preexisting('notes', note('old2', 'also old', 60));
    const first = await a.engine.sync();
    expect(first.pushed).toBe(2);
    expect((await a.engine.sync()).pushed).toBe(0);
    const b = device();
    await b.engine.sync();
    expect(b.read('notes', 'old2').text).toBe('also old');
  });

  it('a second device that already has the same notes does not overwrite a newer edit from the first', async () => {
    const a = device();
    const b = device();
    a.preexisting('notes', note('n1', 'shared', 100));
    b.preexisting('notes', note('n1', 'shared', 100));
    await a.engine.sync();
    await a.write('notes', note('n1', 'edited on A', 900));
    await a.engine.sync();
    await b.engine.sync(); // pulls A's edit, then seeds its own (older) copy: must not win
    await a.engine.sync();
    expect(a.read('notes', 'n1').text).toBe('edited on A');
    expect(b.read('notes', 'n1').text).toBe('edited on A');
  });
});

describe('pictures', () => {
  it('travel with their record, byte for byte, and are not sent again when only the record changes', async () => {
    const a = device();
    const b = device();
    await a.write('photos', { id: 'p1', blob: fileOf(9, 8, 7), mime: 'image/jpeg', at: 5, updatedAt: 5 });
    await a.engine.sync();
    expect(calls.filter((c) => c === 'putBlob:p1')).toHaveLength(1);
    await b.engine.sync();
    expect([...b.read('photos', 'p1').blob.bytes]).toEqual([9, 8, 7]);

    await a.write('photos', { id: 'p1', blob: fileOf(9, 8, 7), mime: 'image/jpeg', at: 5, updatedAt: 50, note: 'edited' });
    await a.engine.sync();
    expect(calls.filter((c) => c === 'putBlob:p1')).toHaveLength(1);
    await b.engine.sync();
    expect(b.read('photos', 'p1').note).toBe('edited');
    expect(calls.filter((c) => c === 'getBlob:p1')).toHaveLength(1); // B kept its copy of the file
  });

  it('one that is too big stays on the device, and the rest still goes through', async () => {
    const a = device();
    await a.write('photos', { id: 'huge', blob: fileOf(...new Array(500).fill(1)), mime: 'image/jpeg', at: 1, updatedAt: 1 });
    await a.write('notes', note('n1', 'fine'));
    const result = await a.engine.sync();
    expect(result.pushed).toBe(1);
    expect(a.waiting.size).toBe(0);
    expect(a.engine.skipped()).toBe(1);
    const b = device();
    await b.engine.sync();
    expect(b.read('photos', 'huge')).toBeUndefined();
    expect(b.read('notes', 'n1').text).toBe('fine');
  });

  it('a deleted picture is deleted everywhere', async () => {
    const a = device();
    const b = device();
    await a.write('photos', { id: 'p1', blob: fileOf(1, 2), mime: 'image/jpeg', at: 5, updatedAt: 5 });
    await a.engine.sync();
    await b.engine.sync();
    await a.erase('photos', 'p1');
    await a.engine.sync();
    await b.engine.sync();
    expect(b.read('photos', 'p1')).toBeUndefined();
  });
});

describe('while a round is running', () => {
  it('a change made during the push stays queued for the next round', async () => {
    let a;
    let first = true;
    a = device({
      beforePush: async () => {
        if (first) {
          first = false;
          await a.write('notes', note('n1', 'edited during the push', 9000));
        }
      },
    });
    await a.write('notes', note('n1', 'first', 8000));
    await a.engine.sync();
    expect(a.waiting.size).toBe(1); // the newer change is still waiting
    await a.engine.sync();
    expect(a.waiting.size).toBe(0);
    const b = device();
    await b.engine.sync();
    expect(b.read('notes', 'n1').text).toBe('edited during the push');
  });

  it('two rounds asked for at once run one after the other', async () => {
    let active = 0;
    let most = 0;
    const a = device({
      beforePull: async () => {
        active += 1;
        most = Math.max(most, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active -= 1;
      },
    });
    await Promise.all([a.engine.sync(), a.engine.sync(), a.engine.sync()]);
    expect(most).toBe(1);
  });
});

describe('when something goes wrong', () => {
  it('reports signed-out, offline and other errors, and keeps the outbox for later', async () => {
    const a = device({
      beforePull: async () => {
        throw Object.assign(new Error('Authentication required'), { status: 401 });
      },
    });
    await a.write('notes', note('n1', 'x'));
    await expect(a.engine.sync()).rejects.toThrow();
    expect(a.statuses.at(-1)).toMatchObject({ state: 'signedout', pending: 1 });

    const offline = device({
      beforePull: async () => {
        throw Object.assign(new Error('Failed to fetch'), { offline: true });
      },
    });
    await offline.write('notes', note('n2', 'y'));
    await expect(offline.engine.sync()).rejects.toThrow();
    expect(offline.statuses.at(-1)).toMatchObject({ state: 'offline', pending: 1 });
    expect(offline.waiting.size).toBe(1);
  });

  it('after an error the next round sends what was waiting', async () => {
    let fail = true;
    const a = device({
      beforePush: async () => {
        if (fail) throw Object.assign(new Error('boom'), { status: 500 });
      },
    });
    await a.write('notes', note('n1', 'x'));
    await expect(a.engine.sync()).rejects.toThrow();
    expect(a.waiting.size).toBe(1);
    fail = false;
    expect((await a.engine.sync()).pushed).toBe(1);
    expect(a.waiting.size).toBe(0);
  });
});

describe('the small rules', () => {
  it('knows when a record was last changed', () => {
    expect(stampOf({ updatedAt: 50, createdAt: 10 })).toBe(50);
    expect(stampOf({ createdAt: 10 }, 99)).toBe(99);
    expect(stampOf({ at: 70 }, 0)).toBe(70);
  });

  it('splits a file out of a record', () => {
    expect(BLOB_FIELD.photos).toBe('blob');
    expect(splitRecord('photos', { id: 'p', blob: 'FILE', mime: 'x' })).toEqual({ doc: { id: 'p', mime: 'x' }, blob: 'FILE' });
    expect(splitRecord('notes', { id: 'n', text: 't' })).toEqual({ doc: { id: 'n', text: 't' }, blob: null });
  });

  it('decides what to do with a change from the server', () => {
    const local = { updatedAt: 100 };
    expect(decide({ local: null, localDirty: false, remoteAt: 5, remoteDeleted: false })).toBe('apply');
    expect(decide({ local: null, localDirty: false, remoteAt: 5, remoteDeleted: true })).toBe('keep');
    expect(decide({ local, localDirty: false, remoteAt: 100, remoteDeleted: false })).toBe('keep');
    expect(decide({ local, localDirty: false, remoteAt: 200, remoteDeleted: false })).toBe('apply');
    expect(decide({ local, localDirty: true, remoteAt: 50, remoteDeleted: false })).toBe('keep');
    expect(decide({ local, localDirty: true, remoteAt: 500, remoteDeleted: false })).toBe('apply');
    expect(decide({ local, localDirty: false, remoteAt: 1, remoteDeleted: true })).toBe('apply');
    expect(decide({ local, localDirty: true, remoteAt: 1, remoteDeleted: true })).toBe('keep');
  });
});
