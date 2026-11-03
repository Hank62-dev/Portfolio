import { useEffect, useState } from 'react';
import { storage } from '../storage';
import { onSynced } from '../sync/events';

// The pictures that go with a diary page. They are made smaller on the way in (a phone photo is several megabytes; the
// page only ever shows it a few hundred pixels wide) and kept on this device with the rest of the diary.

const MAX_SIDE = 1280;
const urls = new Map(); // photo id -> object URL, made once and kept for the visit

/** A smaller copy of an image file, as a JPEG blob. Falls back to the original when the browser cannot decode it. */
export const shrink = async (file, side = MAX_SIDE) => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
};

/** Stores a picture (already a blob) and returns its id. */
export const addPhotoBlob = async (blob) => {
  const id = crypto.randomUUID();
  const now = Date.now();
  await storage.photos.put({ id, blob, mime: blob.type || 'image/jpeg', at: now, updatedAt: now });
  return id;
};

/** Makes an image file smaller, stores it and returns its id. */
export const addPhoto = async (file) => addPhotoBlob(await shrink(file));

export const removePhoto = async (id) => {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
  await storage.photos.remove(id);
};

/** The address to show a stored picture at, or '' until it has been read. */
export function usePhoto(id) {
  const [url, setUrl] = useState(() => urls.get(id) ?? '');
  const [again, setAgain] = useState(0); // a picture that came from another device after this page was drawn
  useEffect(() => {
    if (!id) return undefined;
    if (urls.has(id)) {
      setUrl(urls.get(id));
      return undefined;
    }
    let live = true;
    storage.photos
      .get(id)
      .then((record) => {
        if (!record) return;
        const made = URL.createObjectURL(record.blob);
        urls.set(id, made);
        if (live) setUrl(made);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id, again]);

  useEffect(() => (id && !url ? onSynced((stores) => stores.includes('photos') && setAgain((n) => n + 1)) : undefined), [id, url]);
  return url;
}
