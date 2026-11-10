// A page being written is kept on the side as it goes, so nothing is lost if the diary locks itself, the phone kills the app,
// or the person leaves without saving. It is cleared when the page is saved or thrown away.

const KEY = 'hank62.diary.draft';
const STALE_MS = 2 * 24 * 60 * 60 * 1000;

/** The draft for `day` out of its saved text, or null (another day, too old, or broken). Pure. */
export const parseDraft = (raw, day, now = Date.now()) => {
  try {
    const draft = JSON.parse(raw ?? 'null');
    if (!draft || draft.day !== day || now - draft.at > STALE_MS) return null;
    return { mood: draft.mood ?? null, body: String(draft.body ?? ''), photos: Array.isArray(draft.photos) ? draft.photos.filter((p) => typeof p === 'string') : [] };
  } catch {
    return null;
  }
};

export const readDraft = (day) => {
  try {
    return parseDraft(localStorage.getItem(KEY), day);
  } catch {
    return null;
  }
};

export const writeDraft = (day, { mood, body, photos }) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, mood, body, photos, at: Date.now() }));
  } catch {
    /* the draft is a safety net; without storage there is just no net */
  }
};

export const clearDraft = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
};
