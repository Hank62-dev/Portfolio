// What changed between two versions of the app, in words a person can read. The list lives in public/changelog.json (newest
// first, one sentence per change in each language) and is NOT part of the app's own files: an app that has just found out a
// newer version is ready asks the server for the list as it is now, so it can say what is in the version it is about to get.

const VERSION = /^\d+\.\d+\.\d+$/;

/** "1.23.0" -> [1, 23, 0]; null when it is not a version. */
export const parseVersion = (text) => (VERSION.test(String(text ?? '')) ? String(text).split('.').map(Number) : null);

/** Below 0 when `a` is the older version, above 0 when it is the newer one, 0 when they are the same. */
export const compareVersions = (a, b) => {
  const x = parseVersion(a) ?? [0, 0, 0];
  const y = parseVersion(b) ?? [0, 0, 0];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/**
 * `{ id, version, date, vi, en }` entries, safe to show: anything that is not text is dropped, and a version that is not
 * "major.minor.patch" is left empty. Each update gets its own version: a new feature moves the middle number, a fix the last.
 * `internal: true` marks an update nobody using the app would notice (the code reorganised, tests, docs): it keeps its
 * place and its version, but it is never shown in what is new.
 */
export const cleanChanges = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && typeof entry.id === 'string' && (typeof entry.vi === 'string' || typeof entry.en === 'string'))
    .map((entry) => ({ id: entry.id, version: parseVersion(entry.version) ? entry.version : '', date: String(entry.date ?? ''), vi: String(entry.vi ?? entry.en).slice(0, 240), en: String(entry.en ?? entry.vi).slice(0, 240), internal: entry.internal === true }));

/**
 * The entries newer than the one the app already has (`knownId`), newest first. When that entry is not in the list any more
 * (the app is many versions behind) only the latest few are shown, rather than a wall of old news. `upToId` leaves out the
 * entries that came after the version being described (a list fetched today may be ahead of the app that fetched it).
 * Internal updates count for finding the place, and are then left out: an update that is only internal says nothing.
 */
export const newerThan = (list, knownId, limit = 6, upToId = '') => {
  const entries = cleanChanges(list);
  const at = entries.findIndex((entry) => entry.id === knownId);
  const top = upToId ? Math.max(0, entries.findIndex((entry) => entry.id === upToId)) : 0;
  return (at === -1 ? entries.slice(top) : entries.slice(top, Math.max(top, at))).filter((entry) => !entry.internal).slice(0, limit);
};

/** The line for one entry in the reader's language. */
export const changeText = (entry, vi) => (vi ? entry.vi : entry.en);
