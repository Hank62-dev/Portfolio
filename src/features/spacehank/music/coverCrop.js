// Covers that come out of audio files are often a wide picture (a video thumbnail) sitting in the middle of a square, with plain
// bars above and below it. In a square frame that looks like a small picture floating in a box. These functions find the bars and
// cut them off, so the picture itself fills the frame.

const SIZE = 160; // the picture is looked at this small: bars do not need more
const NEAR = 18; // how far a pixel may be from the bar's colour and still be the bar (0 to 255, summed over the channels' largest gap)
const MIN_BAR = 0.04; // a bar thinner than this share of the picture is ignored (an edge, not a bar)
const MIN_KEEP = 0.35; // never keep less than this share of a side: a dark picture is not a bar

const colourAt = (data, w, x, y) => {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};
const near = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) <= NEAR;

/** Whether the whole row (or column) at `index` is one flat colour, and if so which. */
const flat = (data, w, h, index, horizontal) => {
  const length = horizontal ? w : h;
  const at = (n) => (horizontal ? colourAt(data, w, n, index) : colourAt(data, w, index, n));
  const first = at(0);
  for (let n = 1; n < length; n += 1) if (!near(at(n), first)) return null;
  return first;
};

/** How many rows (or columns) from one edge are the same flat colour as the edge itself. */
const depth = (data, w, h, horizontal, fromEnd) => {
  const count = horizontal ? h : w;
  const index = (n) => (fromEnd ? count - 1 - n : n);
  const edge = flat(data, w, h, index(0), horizontal);
  if (!edge) return 0;
  let n = 1;
  while (n < count) {
    const colour = flat(data, w, h, index(n), horizontal);
    if (!colour || !near(colour, edge)) break;
    n += 1;
  }
  return n;
};

/**
 * Finds the plain bars around a picture. `data` is RGBA pixels (like ImageData.data) of a picture `w` by `h`.
 * Returns { top, bottom, left, right } in pixels, or null when there are no bars worth cutting. Pure.
 */
export const findBars = (data, w, h) => {
  const bars = {
    top: depth(data, w, h, true, false),
    bottom: depth(data, w, h, true, true),
    left: depth(data, w, h, false, false),
    right: depth(data, w, h, false, true),
  };
  // a bar is only a bar when it is thick enough to matter, and what is left is still most of the picture
  if (bars.top / h < MIN_BAR) bars.top = 0;
  if (bars.bottom / h < MIN_BAR) bars.bottom = 0;
  if (bars.left / w < MIN_BAR) bars.left = 0;
  if (bars.right / w < MIN_BAR) bars.right = 0;
  if (!bars.top && !bars.bottom && !bars.left && !bars.right) return null;
  if (h - bars.top - bars.bottom < h * MIN_KEEP || w - bars.left - bars.right < w * MIN_KEEP) return null;
  return bars;
};

/**
 * The square to cut out of a picture `w` by `h` with these bars: the middle of what is left after the bars, as large as it fits.
 * Returns { x, y, side } in the picture's own pixels. Pure.
 */
export const squareFrom = (bars, w, h) => {
  const left = bars?.left ?? 0;
  const top = bars?.top ?? 0;
  const cw = w - left - (bars?.right ?? 0);
  const ch = h - top - (bars?.bottom ?? 0);
  const side = Math.max(1, Math.min(cw, ch));
  return { x: Math.round(left + (cw - side) / 2), y: Math.round(top + (ch - side) / 2), side: Math.round(side) };
};

/**
 * A picture file with its plain bars cut away and the rest made square, as a new blob; the same file when there is nothing to cut
 * (or the browser cannot decode it).
 */
export const cropBars = async (file) => {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SIZE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const probe = document.createElement('canvas');
    probe.width = w;
    probe.height = h;
    const context = probe.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, w, h);
    const bars = findBars(context.getImageData(0, 0, w, h).data, w, h);
    if (!bars) {
      bitmap.close?.();
      return file;
    }
    // work out the square in the small picture, then cut the same square out of the full-size one
    const small = squareFrom(bars, w, h);
    const x = Math.round(small.x / scale);
    const y = Math.round(small.y / scale);
    const side = Math.max(1, Math.min(Math.round(small.side / scale), bitmap.width - x, bitmap.height - y));
    const out = document.createElement('canvas');
    const target = Math.min(side, 640);
    out.width = target;
    out.height = target;
    out.getContext('2d').drawImage(bitmap, x, y, side, side, 0, 0, target, target);
    bitmap.close?.();
    return (await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92))) ?? file;
  } catch {
    return file;
  }
};
