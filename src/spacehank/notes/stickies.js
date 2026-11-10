import { createStore } from '../store';

// Sticky notes: notes that float over the app, so they stay on screen whichever tab is open. The note itself is an
// ordinary note (it syncs and is searched like any other); which notes float, where, how big and in what colour is
// kept on this device only, since a place on a phone means nothing on a wide screen.

const KEY = 'hank62.stickies';

/** The paper colours a sticky can be. */
export const STICKY_COLORS = ['yellow', 'pink', 'green', 'blue', 'violet', 'paper'];

export const STICKY_SIZE = { w: 260, h: 220, minW: 200, minH: 140, maxW: 520, maxH: 560 };
const HEADER = 40; // a sticky can be pushed off screen, but never so far that its header (its handle) is lost

/** Keeps a sticky on screen: at least its header stays reachable, and it is never bigger than the screen. */
export const clampSticky = (sticky, vw, vh) => {
  const w = Math.max(STICKY_SIZE.minW, Math.min(sticky.w, STICKY_SIZE.maxW, vw - 16));
  const h = Math.max(STICKY_SIZE.minH, Math.min(sticky.h, STICKY_SIZE.maxH, vh - 16));
  const x = Math.max(8 - w + 80, Math.min(sticky.x, vw - 80));
  const y = Math.max(8, Math.min(sticky.y, vh - HEADER));
  return { ...sticky, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
};

/** Where a new sticky goes: near the top right, each new one a step down and to the left of the last, wrapping round. */
export const nextSpot = (list, vw, vh) => {
  const w = Math.min(STICKY_SIZE.w, vw - 24);
  const step = list.length % 6;
  return clampSticky({ x: vw - w - 24 - step * 28, y: 88 + step * 32, w, h: STICKY_SIZE.h }, vw, vh);
};

/** The colour after this one, going round. */
export const nextColor = (color) => STICKY_COLORS[(STICKY_COLORS.indexOf(color) + 1) % STICKY_COLORS.length];

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((s) => s && typeof s.id === 'string') : [];
  } catch {
    return [];
  }
};

/** `list`: the floating notes, the last one on top. */
export const stickies = createStore({ list: read() });

const write = (list) => {
  stickies.set({ list });
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage is blocked: the stickies last until the page closes */
  }
};

const viewport = () => (typeof window === 'undefined' ? { vw: 1280, vh: 800 } : { vw: window.innerWidth, vh: window.innerHeight });

export const isFloating = (id) => stickies.get().list.some((s) => s.id === id);

/** Puts a note on the screen (or brings it to the front if it is already there). */
export const floatNote = (id, color) => {
  const { list } = stickies.get();
  const have = list.find((s) => s.id === id);
  if (have) return bringToFront(id);
  const { vw, vh } = viewport();
  const used = list.map((s) => s.color);
  const fresh = color ?? STICKY_COLORS.find((c) => !used.includes(c)) ?? STICKY_COLORS[list.length % STICKY_COLORS.length];
  write([...list, { id, ...nextSpot(list, vw, vh), color: fresh, min: false }]);
};

export const unfloat = (id) => write(stickies.get().list.filter((s) => s.id !== id));

export const toggleFloat = (id) => (isFloating(id) ? unfloat(id) : floatNote(id));

export const bringToFront = (id) => {
  const { list } = stickies.get();
  const at = list.findIndex((s) => s.id === id);
  if (at < 0 || at === list.length - 1) return;
  write([...list.slice(0, at), ...list.slice(at + 1), list[at]]);
};

/** Changes one sticky (its place, size, colour, folded or not), keeping it on screen. */
export const patchSticky = (id, patch) => {
  const { vw, vh } = viewport();
  write(stickies.get().list.map((s) => (s.id === id ? clampSticky({ ...s, ...patch }, vw, vh) : s)));
};

/** After the window changes size, pulls every sticky back onto the screen. */
export const refitStickies = () => {
  const { vw, vh } = viewport();
  const { list } = stickies.get();
  const next = list.map((s) => clampSticky(s, vw, vh));
  if (next.some((s, i) => s.x !== list[i].x || s.y !== list[i].y || s.w !== list[i].w || s.h !== list[i].h)) write(next);
};

/** Forgets the stickies whose note is gone (deleted here or on another device). */
export const dropMissing = (ids) => {
  const { list } = stickies.get();
  const keep = list.filter((s) => ids.has(s.id));
  if (keep.length !== list.length) write(keep);
};
