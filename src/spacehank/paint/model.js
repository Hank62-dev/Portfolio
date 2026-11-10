import { locale, tr } from '../lang.js';

// Paint as plain functions: the sizes and colours on offer, the flood fill, the maths of the view, and the list of layers.
// Everything that touches a canvas is in engine.js; what can be worked out without one is here, and tested.

export const SIZES = [
  { id: 'square', width: 1080, height: 1080, label: tr('Square') },
  { id: 'wide', width: 1600, height: 1000, label: tr('Wide') },
  { id: 'tall', width: 1080, height: 1440, label: tr('Tall') },
];

/** Backgrounds for a new drawing; `color: null` is a transparent one (drawn on a chequerboard). */
export const BACKGROUNDS = [
  { id: 'white', color: '#ffffff', label: tr('White') },
  { id: 'paper', color: '#f4efe4', label: tr('Paper') },
  { id: 'night', color: '#16181d', label: tr('Night') },
  { id: 'clear', color: null, label: tr('Clear') },
];

export const PALETTE = ['#111114', '#5b5f66', '#a5a9b1', '#ffffff', '#e5484d', '#f76b15', '#f5b100', '#46a758', '#12a594', '#0091ff', '#3e63dd', '#8e4ec6', '#d6409f', '#9a6a43', '#f4d6b0', '#2b5d3a'];

/** The largest side of a drawing, so a phone does not run out of memory on a huge photograph. */
export const MAX_SIDE = 2400;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const HISTORY_LIMIT = 40;

export const hexToRgba = (hex, alpha = 255) => {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean.padEnd(6, '0');
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0, alpha];
};

export const rgbaToHex = ([r, g, b]) => `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;

/** The size of a picture of `width` by `height` shrunk, when it is bigger, so its longest side is `max` (never made bigger). */
export const fitDoc = (width, height, max = MAX_SIDE) => {
  const k = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
};

export const clampZoom = (k) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/** The zoom and offset that show the whole drawing in the middle of a view, with `pad` pixels round it. */
export const fitView = (view, doc, pad = 24) => {
  const k = clampZoom(Math.min((view.width - pad * 2) / doc.width, (view.height - pad * 2) / doc.height));
  return { k, x: (view.width - doc.width * k) / 2, y: (view.height - doc.height * k) / 2 };
};

/** Zooms to `k` keeping the point (`cx`, `cy`) of the view where it is (the cursor or the middle of two fingers). */
export const zoomAt = (view, k, cx, cy) => {
  const next = clampZoom(k);
  const ratio = next / view.k;
  return { k: next, x: cx - (cx - view.x) * ratio, y: cy - (cy - view.y) * ratio };
};

/** The box (x, y, w, h) round some points, `pad` bigger on every side and kept inside the drawing; null when there are none. */
export const bboxOf = (points, pad, width, height) => {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad));
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - pad));
  const x1 = Math.min(width, Math.ceil(Math.max(...xs) + pad));
  const y1 = Math.min(height, Math.ceil(Math.max(...ys) + pad));
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
};

/** The part of some pixels (`{ data, width, height }`) inside `rect`, as pixels of its own. */
export const cropData = (src, rect) => {
  const out = new Uint8ClampedArray(rect.w * rect.h * 4);
  for (let row = 0; row < rect.h; row += 1) {
    const from = ((rect.y + row) * src.width + rect.x) * 4;
    out.set(src.data.subarray(from, from + rect.w * 4), row * rect.w * 4);
  }
  return { data: out, width: rect.w, height: rect.h };
};

/**
 * The pixels joined to (`x`, `y`) that look like it, as a mask (1 for a pixel in the region). "Look like" is that no channel
 * (red, green, blue, opacity) is more than `tolerance` away from the pixel clicked. Returns { mask, count, rect } (rect is the
 * box round the region; null when the click was outside the drawing).
 */
export const floodRegion = (data, width, height, x, y, tolerance = 28) => {
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return { mask: new Uint8Array(0), count: 0, rect: null };
  const mask = new Uint8Array(width * height);
  const at = (i) => i * 4;
  const start = at(sy * width + sx);
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const like = (i) => {
    const p = at(i);
    return Math.abs(data[p] - target[0]) <= tolerance && Math.abs(data[p + 1] - target[1]) <= tolerance && Math.abs(data[p + 2] - target[2]) <= tolerance && Math.abs(data[p + 3] - target[3]) <= tolerance;
  };
  const stack = [[sx, sy]];
  let count = 0;
  let minX = sx;
  let maxX = sx;
  let minY = sy;
  let maxY = sy;
  while (stack.length) {
    const [px, py] = stack.pop();
    let left = px;
    while (left >= 0 && !mask[py * width + left] && like(py * width + left)) left -= 1;
    left += 1;
    let above = false;
    let below = false;
    for (let cx = left; cx < width && !mask[py * width + cx] && like(py * width + cx); cx += 1) {
      mask[py * width + cx] = 1;
      count += 1;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (py > 0) {
        const up = (py - 1) * width + cx;
        if (!mask[up] && like(up)) {
          if (!above) stack.push([cx, py - 1]);
          above = true;
        } else above = false;
      }
      if (py < height - 1) {
        const down = (py + 1) * width + cx;
        if (!mask[down] && like(down)) {
          if (!below) stack.push([cx, py + 1]);
          below = true;
        } else below = false;
      }
    }
  }
  return { mask, count, rect: count ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null };
};

/** Paints `rgba` on every pixel of `data` the mask marks, and a little round the edge of the region so the fill meets the line. */
export const paintMask = (data, width, height, mask, rgba, grow = 1) => {
  const marked = new Uint8Array(mask);
  if (grow > 0) {
    for (let pass = 0; pass < grow; pass += 1) {
      const copy = new Uint8Array(marked);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = y * width + x;
          if (copy[i]) continue;
          if ((x > 0 && copy[i - 1]) || (x < width - 1 && copy[i + 1]) || (y > 0 && copy[i - width]) || (y < height - 1 && copy[i + width])) marked[i] = 1;
        }
      }
    }
  }
  for (let i = 0; i < marked.length; i += 1) {
    if (!marked[i]) continue;
    const p = i * 4;
    data[p] = rgba[0];
    data[p + 1] = rgba[1];
    data[p + 2] = rgba[2];
    data[p + 3] = rgba[3];
  }
};

// ---- layers: the list, top first, and what can be done to it (each returns a new list) -------------------------------

let counter = 0;
export const newLayerMeta = (name, id = `layer-${Date.now().toString(36)}-${(counter += 1)}`) => ({ id, name, visible: true, opacity: 1 });

export const nextLayerName = (layers) => `${tr('Layer')} ${layers.length + 1}`;

/** Moves a layer one step up (`-1`: towards the front of the list) or down (`1`). */
export const moveLayer = (layers, id, step) => {
  const from = layers.findIndex((l) => l.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= layers.length) return layers;
  const next = [...layers];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

/** Which layer is chosen after `id` is taken out: the one that took its place, or the last. */
export const layerAfterRemoving = (layers, id) => {
  const index = layers.findIndex((l) => l.id === id);
  const rest = layers.filter((l) => l.id !== id);
  return rest[Math.min(Math.max(index, 0), rest.length - 1)]?.id ?? null;
};

/** "Drawing 9 Nov, 10:42": the name a new drawing gets. */
export const defaultName = (now = new Date()) => `${tr('Drawing')} ${now.toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}`;
