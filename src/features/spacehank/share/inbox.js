// The share inbox. When another app shares something to Hank62, the service worker (public/sw-focus.js) receives it and
// puts it in a cache called `hank62-share`; the app opens as /spacehank?share=1 and reads it from there. Nothing is saved
// to the notes until the person picks where it goes. Only the latest share is kept, and it is forgotten after a day.

export const SHARE_CACHE = 'hank62-share';
const META = '/__share/meta';
const DAY = 24 * 60 * 60 * 1000;

/** { title, text, url, files: [Blob] } for the waiting share, or null when there is none (or it is stale). */
export const readShare = async () => {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(SHARE_CACHE);
    const response = await cache.match(META);
    if (!response) return null;
    const meta = await response.json();
    if (!meta?.at || Date.now() - meta.at > DAY) {
      await clearShare();
      return null;
    }
    const files = [];
    for (let i = 0; i < (meta.files?.length ?? 0); i += 1) {
      const file = await cache.match(`/__share/file/${i}`);
      if (file) files.push(await file.blob());
    }
    return { title: meta.title ?? '', text: meta.text ?? '', url: meta.url ?? '', files };
  } catch {
    return null;
  }
};

/** Forgets the waiting share. */
export const clearShare = async () => {
  try {
    if (typeof caches !== 'undefined') await caches.delete(SHARE_CACHE);
  } catch {
    /* nothing to forget */
  }
};
