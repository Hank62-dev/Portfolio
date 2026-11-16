// The shapes the page's dust can take, one per section. Each is `count` points (x, y, z) in world units,
// centred on the origin and about 4 units across, written into a Float32Array. Pure maths, so it is tested
// without a browser; `text` alone needs a canvas and is given the sampled points instead.

import { seeded } from '../stack/config';

const TAU = Math.PI * 2;

const fill = (count, at) => {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const [x, y, z] = at(i, count);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
};

/** A loose cloud filling the screen: the page at rest. */
export const dust = (count, seed = 1) => {
  const r = seeded(seed);
  return fill(count, () => [(r() - 0.5) * 16, (r() - 0.5) * 9, (r() - 0.5) * 6 - 1]);
};

/** A sheet of points, gently tilted: the shader rolls waves through it. */
export const wave = (count) => {
  const cols = Math.ceil(Math.sqrt(count * 1.8));
  const rows = Math.ceil(count / cols);
  return fill(count, (i) => {
    const c = i % cols;
    const row = Math.floor(i / cols);
    return [(c / (cols - 1) - 0.5) * 6.4, -1.2, (row / Math.max(1, rows - 1) - 0.5) * 3.6];
  });
};

/** Four stacked rings: the layers of the stack, seen as orbits. */
export const rings = (count, seed = 2) => {
  const r = seeded(seed);
  const radii = [1.9, 1.55, 1.2, 0.85];
  return fill(count, (i) => {
    const layer = i % 4;
    const a = r() * TAU;
    const rr = radii[layer] + (r() - 0.5) * 0.12;
    return [Math.cos(a) * rr, 1.05 - layer * 0.7 + (r() - 0.5) * 0.05, Math.sin(a) * rr];
  });
};

/** A double helix lying across the screen, with rungs between the strands. */
export const helix = (count, seed = 3) => {
  const r = seeded(seed);
  return fill(count, (i) => {
    const t = i / count;
    const x = (t - 0.5) * 7.5;
    const a = t * TAU * 4.5;
    if (i % 5 === 0) {
      // a rung: a point somewhere between the two strands
      const k = r() * 2 - 1;
      return [x, Math.sin(a) * 0.9 * k, Math.cos(a) * 0.9 * k];
    }
    const side = i % 2 ? 0 : Math.PI;
    const j = (r() - 0.5) * 0.08;
    return [x + j, Math.sin(a + side) * 0.9 + j, Math.cos(a + side) * 0.9 + j];
  });
};

/** The edges of a cube: the room of the VR gallery. */
export const cube = (count, seed = 4) => {
  const r = seeded(seed);
  const s = 1.45;
  return fill(count, () => {
    // pick one of the twelve edges: two coordinates at a corner, the third anywhere along it
    const axis = Math.floor(r() * 3);
    const a = r() < 0.5 ? -s : s;
    const b = r() < 0.5 ? -s : s;
    const t = (r() * 2 - 1) * s;
    const j = () => (r() - 0.5) * 0.04;
    const p = axis === 0 ? [t, a, b] : axis === 1 ? [a, t, b] : [a, b, t];
    return [p[0] + j(), p[1] + j(), p[2] + j()];
  });
};

/** A sphere, its points spread evenly (a Fibonacci lattice). */
export const sphere = (count) => {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return fill(count, (i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const a = golden * i;
    return [Math.cos(a) * rr * 1.8, y * 1.8, Math.sin(a) * rr * 1.8];
  });
};

/** Points sampled from text ({x, y} in 0..1 of its box, aspect = width / height), spread over `width` units. */
export const fromSamples = (count, samples, aspect, width = 7, seed = 5) => {
  const r = seeded(seed);
  if (!samples.length) return sphere(count);
  const height = width / aspect;
  return fill(count, (i) => {
    const s = samples[i % samples.length];
    return [(s.x - 0.5) * width + (r() - 0.5) * 0.02, (0.5 - s.y) * height + (r() - 0.5) * 0.02, (r() - 0.5) * 0.35];
  });
};

/** Samples the inked pixels of `text` set in `font` (a browser canvas is needed). */
export const sampleText = (text, font) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = `400 160px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width) + 20;
  const h = 200;
  canvas.width = w;
  canvas.height = h;
  ctx.font = `400 160px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 10, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const samples = [];
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) if (data[(y * w + x) * 4 + 3] > 128) samples.push({ x: x / w, y: y / h });
  // shuffle, so any count of particles covers the whole word evenly
  const r = seeded(9);
  for (let i = samples.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }
  return { samples, aspect: w / h };
};

/**
 * Where each section puts the dust: which shape, where on the screen (x, y in world units from the
 * centre), how big, and how visible. Sections with a picture of their own get the quiet cloud.
 */
export const SECTION_SHAPES = {
  top: { shape: 'dust', x: 0, y: 0, scale: 1, alpha: 0.35, spin: true },
  work: { shape: 'wave', x: 1.8, y: -1.5, scale: 1.1, alpha: 0.6, spin: false },
  stack: { shape: 'dust', x: 0, y: 0, scale: 1, alpha: 0.3, spin: true },
  lab: { shape: 'helix', x: 0, y: -0.2, scale: 1.05, alpha: 0.4, spin: false },
  immersive: { shape: 'cube', x: 4.3, y: 1.2, scale: 0.55, alpha: 0.7, spin: true },
  about: { shape: 'sphere', x: 4.1, y: -0.2, scale: 0.62, alpha: 0.8, spin: true },
  activity: { shape: 'rings', x: 4.2, y: 1.4, scale: 0.55, alpha: 0.6, spin: true },
  whispers: { shape: 'dust', x: 0, y: 0, scale: 1, alpha: 0.25, spin: true },
  contact: { shape: 'text', x: 2.35, y: 1.45, scale: 0.5, alpha: 0.85, spin: false },
};

export const SHAPES = { dust, wave, rings, helix, cube, sphere };
