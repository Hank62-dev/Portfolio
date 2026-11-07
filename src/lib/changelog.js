// What changed between two versions of the app, in words a person can read. The list lives in public/changelog.json (newest
// first, one sentence per change in each language) and is NOT part of the app's own files: an app that has just found out a
// newer version is ready asks the server for the list as it is now, so it can say what is in the version it is about to get.

/** `{ id, date, vi, en }` entries, safe to show: anything that is not text is dropped. */
export const cleanChanges = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && typeof entry.id === 'string' && (typeof entry.vi === 'string' || typeof entry.en === 'string'))
    .map((entry) => ({ id: entry.id, date: String(entry.date ?? ''), vi: String(entry.vi ?? entry.en).slice(0, 240), en: String(entry.en ?? entry.vi).slice(0, 240) }));

/**
 * The entries newer than the one the app already has (`knownId`), newest first. When that entry is not in the list any more
 * (the app is many versions behind) only the latest few are shown, rather than a wall of old news. `upToId` leaves out the
 * entries that came after the version being described (a list fetched today may be ahead of the app that fetched it).
 */
export const newerThan = (list, knownId, limit = 6, upToId = '') => {
  const entries = cleanChanges(list);
  const at = entries.findIndex((entry) => entry.id === knownId);
  const top = upToId ? Math.max(0, entries.findIndex((entry) => entry.id === upToId)) : 0;
  return (at === -1 ? entries.slice(top) : entries.slice(top, Math.max(top, at))).slice(0, limit);
};

/** The line for one entry in the reader's language. */
export const changeText = (entry, vi) => (vi ? entry.vi : entry.en);
