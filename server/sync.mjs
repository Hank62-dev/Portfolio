import { HttpError } from './http.mjs';

// Keeps the owner's personal data (notes, diary, habits, money, Creator Lab…) in a real Postgres database so every device
// sees the same thing. It is a plain "last edit wins" log: each record is a JSON document with the time it was last changed; a
// device pushes what it changed and pulls what changed elsewhere since the last number (`seq`) it saw. Deleting leaves a
// tombstone so the delete reaches the other devices too. Pictures and voice memos are stored beside it as binary files.
//
// The database is reached through one function, `db.query(sql, params)`, so it is the `pg` pool in production (Neon) and an
// in-process Postgres (PGlite) in tests and local development.

/** What may be synced, and which of them carry a binary file. Anything else is refused. */
export const SYNC_STORES = {
  notes: {},
  tasks: {},
  expenses: {},
  budgets: {},
  courses: {},
  cards: {},
  habits: {},
  content: {},
  income: {},
  deals: {},
  prompts: {},
  settings: {},
  chats: {}, // Hank RAG conversations: one record each (title, session) …
  chatMsgs: {}, // … and one small record per message, so a long chat never outgrows the size limit of a record
  memos: { blob: true },
  images: { blob: true },
  photos: { blob: true },
};

const MAX_DOC_BYTES = 256 * 1024;
const MAX_CHANGES = 100;
const MAX_PULL = 200;

const SCHEMA = [
  `CREATE SEQUENCE IF NOT EXISTS sync_seq`,
  `CREATE TABLE IF NOT EXISTS sync_docs (
     store       TEXT        NOT NULL,
     id          TEXT        NOT NULL,
     doc         JSONB,
     deleted     BOOLEAN     NOT NULL DEFAULT FALSE,
     updated_at  BIGINT      NOT NULL,
     seq         BIGINT      NOT NULL DEFAULT nextval('sync_seq'),
     PRIMARY KEY (store, id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sync_docs_seq ON sync_docs (seq)`,
  `CREATE TABLE IF NOT EXISTS sync_blobs (
     store       TEXT   NOT NULL,
     id          TEXT   NOT NULL,
     mime        TEXT   NOT NULL,
     size        INTEGER NOT NULL,
     data        BYTEA  NOT NULL,
     updated_at  BIGINT NOT NULL,
     PRIMARY KEY (store, id)
   )`,
];

const num = (value) => Number(value);

export const createSync = ({ db, maxBlobBytes = 4 * 1024 * 1024, quotaBytes = 300 * 1024 * 1024 }) => {
  let ready = null;
  const init = () => (ready ??= (async () => {
    for (const statement of SCHEMA) await db.query(statement);
  })().catch((error) => {
    ready = null;
    throw error;
  }));

  const checkStore = (store) => {
    if (!Object.hasOwn(SYNC_STORES, store)) throw new HttpError(400, `Unknown store "${String(store).slice(0, 30)}".`);
  };
  const checkId = (id) => {
    if (typeof id !== 'string' || !id || id.length > 120) throw new HttpError(400, 'A record has a bad id.');
  };

  /** What the database holds, in bytes of documents and files, and how many records. */
  const usage = async () => {
    await init();
    const [docs, blobs] = await Promise.all([
      db.query(`SELECT COUNT(*) FILTER (WHERE NOT deleted) AS records, COALESCE(SUM(LENGTH(doc::text)), 0) AS bytes FROM sync_docs`),
      db.query(`SELECT COALESCE(SUM(size), 0) AS bytes, COUNT(*) AS files FROM sync_blobs`),
    ]);
    const used = num(docs.rows[0].bytes) + num(blobs.rows[0].bytes);
    return { records: num(docs.rows[0].records), files: num(blobs.rows[0].files), usedBytes: used, quotaBytes };
  };

  /**
   * Applies a batch of changes: [{ store, id, doc, deleted, updatedAt }]. A change older than what is stored is ignored (the
   * newest edit wins). Returns { applied, skipped, cursor }.
   */
  const push = async (changes) => {
    await init();
    if (!Array.isArray(changes) || changes.length === 0) throw new HttpError(400, 'Nothing to push.');
    if (changes.length > MAX_CHANGES) throw new HttpError(400, `Push at most ${MAX_CHANGES} changes at a time.`);
    let applied = 0;
    for (const change of changes) {
      checkStore(change?.store);
      checkId(change.id);
      const updatedAt = Math.floor(Number(change.updatedAt));
      if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw new HttpError(400, 'A record has no time.');
      const deleted = Boolean(change.deleted);
      let json = null;
      if (!deleted) {
        if (!change.doc || typeof change.doc !== 'object' || Array.isArray(change.doc)) throw new HttpError(400, 'A record is not an object.');
        json = JSON.stringify(change.doc);
        if (json.length > MAX_DOC_BYTES) throw new HttpError(413, 'A record is too large to sync.');
      }
      const result = await db.query(
        `INSERT INTO sync_docs (store, id, doc, deleted, updated_at) VALUES ($1, $2, $3::jsonb, $4, $5)
         ON CONFLICT (store, id) DO UPDATE SET doc = EXCLUDED.doc, deleted = EXCLUDED.deleted, updated_at = EXCLUDED.updated_at, seq = nextval('sync_seq')
         WHERE sync_docs.updated_at <= EXCLUDED.updated_at
         RETURNING seq`,
        [change.store, change.id, json, deleted, updatedAt]
      );
      if (result.rows.length) applied += 1;
      if (result.rows.length && deleted && SYNC_STORES[change.store].blob) await db.query(`DELETE FROM sync_blobs WHERE store = $1 AND id = $2`, [change.store, change.id]);
    }
    const cursor = await db.query(`SELECT COALESCE(MAX(seq), 0) AS cursor FROM sync_docs`);
    return { applied, skipped: changes.length - applied, cursor: num(cursor.rows[0].cursor) };
  };

  /** What changed after `since`, oldest first, at most `limit`: { changes, cursor, more }. A document that has a file says so. */
  const pull = async (since = 0, limit = MAX_PULL) => {
    await init();
    const from = Math.max(0, Math.floor(Number(since)) || 0);
    const take = Math.max(1, Math.min(MAX_PULL, Math.floor(Number(limit)) || MAX_PULL));
    const result = await db.query(
      `SELECT d.store, d.id, d.doc, d.deleted, d.updated_at, d.seq, (b.id IS NOT NULL) AS has_blob, b.mime AS blob_mime, b.size AS blob_size
       FROM sync_docs d LEFT JOIN sync_blobs b ON b.store = d.store AND b.id = d.id
       WHERE d.seq > $1 ORDER BY d.seq ASC LIMIT $2`,
      [from, take + 1]
    );
    const rows = result.rows.slice(0, take);
    return {
      changes: rows.map((r) => ({
        store: r.store,
        id: r.id,
        doc: r.deleted ? null : r.doc,
        deleted: r.deleted,
        updatedAt: num(r.updated_at),
        seq: num(r.seq),
        blob: r.has_blob ? { mime: r.blob_mime, size: num(r.blob_size) } : null,
      })),
      cursor: rows.length ? num(rows[rows.length - 1].seq) : from,
      more: result.rows.length > take,
    };
  };

  /** Stores one picture or recording for a record. */
  const putBlob = async ({ store, id, mime, data, updatedAt }) => {
    await init();
    checkStore(store);
    checkId(id);
    if (!SYNC_STORES[store].blob) throw new HttpError(400, 'That store has no files.');
    if (!data?.length) throw new HttpError(400, 'The file is empty.');
    if (data.length > maxBlobBytes) throw new HttpError(413, `That file is larger than ${Math.round(maxBlobBytes / 1024 / 1024)} MB, so it stays on this device only.`);
    const { usedBytes } = await usage();
    const existing = await db.query(`SELECT size FROM sync_blobs WHERE store = $1 AND id = $2`, [store, id]);
    const added = data.length - (existing.rows[0] ? num(existing.rows[0].size) : 0);
    if (usedBytes + added > quotaBytes) throw new HttpError(413, 'The sync storage is full. Delete some pictures or recordings, or raise SYNC_QUOTA_MB.');
    await db.query(
      `INSERT INTO sync_blobs (store, id, mime, size, data, updated_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (store, id) DO UPDATE SET mime = EXCLUDED.mime, size = EXCLUDED.size, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [store, id, String(mime || 'application/octet-stream').slice(0, 100), data.length, Buffer.from(data), Math.floor(Number(updatedAt)) || Date.now()]
    );
    return { ok: true, size: data.length };
  };

  const getBlob = async ({ store, id }) => {
    await init();
    checkStore(store);
    checkId(id);
    const result = await db.query(`SELECT mime, data FROM sync_blobs WHERE store = $1 AND id = $2`, [store, id]);
    if (!result.rows.length) throw new HttpError(404, 'No such file.');
    return { mime: result.rows[0].mime, data: Buffer.from(result.rows[0].data) };
  };

  return { init, push, pull, putBlob, getBlob, usage };
};
