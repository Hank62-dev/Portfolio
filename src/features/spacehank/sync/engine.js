// The sync engine: keeps this device's records in step with the owner's database, through the realtime server.
//
// It is local-first. Everything keeps working offline against IndexedDB; every change is also put in an "outbox", and the engine
// sends the outbox when it can and pulls what changed on other devices. When two devices change the same record the later edit
// wins (by the time on the record). Deletes are sent too. Pictures and recordings travel as files next to their record.
//
// Everything it touches from outside is passed in, so the whole thing is tested with in-memory stand-ins:
//   tables   { get(store, id), put(store, record), remove(store, id), all(store) }   the device's records (no sync hook)
//   outbox   { all(), put(entry), remove(key) }                                       entry: { key, store, id, deleted, at }
//   api      { push(changes), pull(since), putBlob(store, id, blob, at), getBlob(store, id) }
//   meta     { get(key), set(key, value) }                                            small values: the cursor, which files were sent

/** Which stores carry a file, and in which field of the record it sits. */
export const BLOB_FIELD = { memos: 'blob', images: 'blob', photos: 'blob' };

const BATCH = 50;
const keyOf = (store, id) => `${store}:${id}`;

/**
 * When a record was last changed: the time it says itself (`updatedAt`); a record that never says (a picture) is as old as its
 * creation, or as the moment its change was queued if that is later. Pure.
 */
export const stampOf = (record, queuedAt = 0) => {
  const edited = Number(record?.updatedAt) || 0;
  if (edited) return edited;
  return Math.max(Number(record?.createdAt) || 0, Number(record?.at) || 0, queuedAt || 0) || Date.now();
};

/** A record split into what goes in the database (the document) and its file. Pure. */
export const splitRecord = (store, record) => {
  const field = BLOB_FIELD[store];
  if (!field || !record) return { doc: { ...record }, blob: null };
  const { [field]: blob, ...doc } = record;
  return { doc, blob: blob ?? null };
};

/**
 * What to do with a change that arrived from the server, given what this device has: 'apply' it, or 'keep' what is here (this
 * device changed it later, or already has this version). Pure.
 */
export const decide = ({ local, localDirty, remoteAt, remoteDeleted }) => {
  if (!local) return remoteDeleted ? 'keep' : 'apply';
  const here = stampOf(local, 0);
  if (localDirty) return here > remoteAt ? 'keep' : 'apply';
  if (remoteDeleted) return 'apply';
  return here >= remoteAt ? 'keep' : 'apply';
};

export const createEngine = ({ tables, outbox, api, meta, stores, now = Date.now, onChange = () => {}, onStatus = () => {} }) => {
  let running = Promise.resolve();
  const sent = () => new Set(JSON.parse(meta.get('sentFiles') ?? '[]'));
  const remember = (set) => meta.set('sentFiles', JSON.stringify([...set].slice(-5000)));
  let skipped = new Set(JSON.parse(meta.get('skipped') ?? '[]')); // records whose file is too big: they stay on this device
  const saveSkipped = () => meta.set('skipped', JSON.stringify([...skipped]));

  /** Puts a change in the outbox. The newest edit to a record replaces an older one waiting there. */
  const queue = async (store, id, deleted = false, at = now()) => {
    await outbox.put({ key: keyOf(store, id), store, id, deleted, at });
  };

  /** Sends everything waiting in the outbox. Returns how many changes were accepted. */
  const push = async () => {
    const entries = await outbox.all();
    if (!entries.length) return 0;
    const files = sent();
    const changes = [];
    const done = []; // outbox entries that are finished one way or another
    for (const entry of entries) {
      const key = entry.key;
      const record = entry.deleted ? null : await tables.get(entry.store, entry.id);
      if (!record) {
        changes.push({ store: entry.store, id: entry.id, deleted: true, updatedAt: entry.at });
        done.push(entry);
        continue;
      }
      const { doc, blob } = splitRecord(entry.store, record);
      if (blob && !files.has(key)) {
        try {
          await api.putBlob(entry.store, entry.id, blob, stampOf(record, entry.at));
          files.add(key);
        } catch (error) {
          if (error.status === 413) {
            // too big for the database: it stays on this device and is left out of the sync
            skipped.add(key);
            saveSkipped();
            done.push(entry);
            continue;
          }
          throw error;
        }
      }
      changes.push({ store: entry.store, id: entry.id, doc, updatedAt: stampOf(record, entry.at) });
      done.push(entry);
    }
    remember(files);
    let accepted = 0;
    for (let i = 0; i < changes.length; i += BATCH) accepted += (await api.push(changes.slice(i, i + BATCH))).applied;
    // an entry changed while it was being sent stays in the outbox (its time is newer than the one that was sent)
    const current = new Map((await outbox.all()).map((e) => [e.key, e.at]));
    for (const entry of done) if (current.get(entry.key) === entry.at) await outbox.remove(entry.key);
    return accepted;
  };

  /** Applies one change that came from the server. Returns the store that changed, or null. */
  const apply = async (change, dirty) => {
    const { store, id } = change;
    const local = await tables.get(store, id);
    const verdict = decide({ local, localDirty: dirty.has(keyOf(store, id)), remoteAt: change.updatedAt, remoteDeleted: change.deleted });
    if (verdict === 'keep') return null;
    if (change.deleted) {
      if (local) await tables.remove(store, id);
      dirty.delete(keyOf(store, id));
      await outbox.remove(keyOf(store, id));
      return local ? store : null;
    }
    const record = { ...change.doc };
    const field = BLOB_FIELD[store];
    if (field && change.blob) {
      if (local?.[field] && (local[field].size ?? local[field].length) === change.blob.size) record[field] = local[field];
      else record[field] = await api.getBlob(store, id, change.blob.mime);
      const files = sent();
      files.add(keyOf(store, id));
      remember(files);
    }
    await tables.put(store, record);
    return store;
  };

  /** Fetches everything that changed elsewhere since the last time. Returns how many records changed here. */
  const pull = async () => {
    let cursor = Number(meta.get('cursor') ?? 0);
    const dirty = new Set((await outbox.all()).map((e) => e.key));
    const changed = new Set();
    let count = 0;
    for (;;) {
      const page = await api.pull(cursor);
      for (const change of page.changes) {
        const store = await apply(change, dirty);
        if (store) {
          changed.add(store);
          count += 1;
        }
      }
      cursor = page.cursor;
      meta.set('cursor', String(cursor));
      if (!page.more) break;
    }
    if (changed.size) onChange([...changed]);
    return count;
  };

  /** Queues every record already on this device, once, so data made before sync existed reaches the database. */
  const seed = async () => {
    if (meta.get('seeded') === '1') return 0;
    let count = 0;
    for (const store of stores) {
      for (const record of await tables.all(store)) {
        await queue(store, record.id, false, stampOf(record, 0)); // its own time, so a copy that is newer elsewhere still wins
        count += 1;
      }
    }
    meta.set('seeded', '1');
    return count;
  };

  /** One round: pull, then (the first time) queue what was already here, then push. Rounds never overlap. */
  const sync = () => {
    const round = running.then(async () => {
      onStatus({ state: 'syncing' });
      try {
        const pulled = await pull();
        await seed();
        const pushed = await push();
        const waiting = (await outbox.all()).length;
        onStatus({ state: 'idle', last: now(), pending: waiting, skipped: skipped.size, pulled, pushed, error: '' });
        return { pulled, pushed };
      } catch (error) {
        onStatus({ state: error.status === 401 ? 'signedout' : error.offline ? 'offline' : 'error', error: error.message, pending: (await outbox.all().catch(() => [])).length });
        throw error;
      }
    });
    running = round.catch(() => {});
    return round;
  };

  return { queue, push, pull, seed, sync, skipped: () => skipped.size };
};
