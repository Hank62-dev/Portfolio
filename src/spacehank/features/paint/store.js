import { tr } from '../../core/i18n/lang';
import { storage } from '../../core/storage';
import { createStore } from '../../core/store';

// The library of drawings: kept in this browser's private storage like the notes, and (being a lot of pixels) not sent to the other devices.
// A record is { id, name, width, height, background, layers: [{ id, name, visible, opacity, blob }], thumb, createdAt, updatedAt }.

export const paintStore = createStore({ items: [], loaded: false, error: '' });

const newest = (a, b) => b.updatedAt - a.updatedAt;

export const loadDrawings = async () => {
  try {
    const items = await storage.drawings.all();
    paintStore.set({ items: items.sort(newest), loaded: true, error: '' });
  } catch {
    paintStore.set({ loaded: true, error: tr('This browser would not open its private storage, so drawings cannot be kept.') });
  }
};

export const saveDrawing = async (record) => {
  await storage.drawings.put(record);
  paintStore.set((s) => ({ items: [...s.items.filter((d) => d.id !== record.id), record].sort(newest) }));
  return record;
};

export const deleteDrawing = async (id) => {
  await storage.drawings.remove(id);
  paintStore.set((s) => ({ items: s.items.filter((d) => d.id !== id) }));
};

export const newDrawingId = () => crypto.randomUUID();
