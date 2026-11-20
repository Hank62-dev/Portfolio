// Live wallpapers made of characters: every picture is a grid of small square tiles, each with a character on it (t % : ;),
// like a mosaic typed on a typewriter. A scene is a background and some creatures drawn tile by tile, moving all the time.
// This file is plain data and maths (the creatures, where they go); engine.js draws them.

import { tr } from '../../core/i18n/lang';

/** A picture as rows of characters: every non-space is a filled tile, and its character says which colour it takes. */
export const mask = (rows) => rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === ' ' ? [] : [[x, y, c]])));
const widthOf = (rows) => Math.max(...rows.map((r) => r.length));

const hash = (a, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** A random number source that is the same every time for the same seed, so a scene looks the same each visit. */
const seeded = (seed) => {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)), ((s ^= s >>> 16) >>> 0) / 4294967296);
};

const CLOUD_BIG = mask([
  '       ######       ',
  '    ############    ',
  '  ################  ',
  ' ################## ',
  '####################',
  ' ################## ',
  '    ############    ',
]);
const CLOUD_SMALL = mask(['   ####    ', ' ######### ', '###########', ' ######### ']);

const JELLY_BELL = mask([
  '    #####    ',
  '  #########  ',
  ' ########### ',
  '#############',
  '#############',
  '-#-#-#-#-#-#-',
]);

// a koi seen from above, facing right: o orange, # white, k black, e the eye
const KOI = [
  '          oo     ',
  ' o    ####ooo##  ',
  ' ooo##ooo####oo#e',
  ' o    ####ooo##  ',
  '          oo     ',
];
const KOI_MASK = mask(KOI);
const KOI_W = widthOf(KOI);

// a sea turtle from above, facing right, with its flippers forward (A) and back (B): # shell, s the plates, h head, f flippers
const TURTLE_A = mask([
  '    ff     ff   ',
  '     ff   ff    ',
  '   #########    ',
  '  ##s##s##s##hh ',
  ' ###s#####s###hh',
  '  ##s##s##s##hh ',
  '   #########    ',
  '     ff   ff    ',
  '    ff     ff   ',
]);
const TURTLE_B = mask([
  '   ff     ff    ',
  '    ff   ff     ',
  '   #########    ',
  '  ##s##s##s##hh ',
  ' ###s#####s###hh',
  '  ##s##s##s##hh ',
  '   #########    ',
  '    ff   ff     ',
  '   ff     ff    ',
]);

const BOAT = mask(['    s    ', '   ss    ', '  sss    ', '#########', ' ####### ', '  #####  ']);
const LILY = mask([' ##### ', '#######', '###  ##', '#######', ' ##### ']);
const FLOWER = mask([' p ', 'ppp', ' p ']);

/** A disc of tiles (the moon), with a few darker craters. */
const disc = (r) => {
  const cells = [];
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) cells.push([x + r, y + r, hash(x, y, 9) < 0.14 ? 'c' : '#']);
  return cells;
};
const MOON = disc(6);

/**
 * The scenes. Each has a name, its colours by night and by day, and `make(cols, rows)` that sets out its creatures and gives
 * back `draw(api, t)`, called every frame with the time in seconds. `api.tile(x, y, colour, ink, seed)` lays a tile with a
 * character, `api.glyph(x, y, char, colour)` a bare character, `api.glow(x, y, colour, size, alpha)` a soft light.
 */
export const SCENES = [
  {
    id: 'clouds',
    name: tr('Cloud drift'),
    colors: {
      light: { sky: ['#7fc1f2', '#cfe8fb'], cloud: '#f6faff', ink: '#a9bfd2', bird: '#46627e' },
      dark: { sky: ['#0b1730', '#1f3858'], cloud: '#34496a', ink: '#5d7596', bird: '#9db3d2' },
    },
    make(cols, rows, c) {
      const rand = seeded(11);
      const clouds = Array.from({ length: Math.max(5, Math.round(cols / 18)) }, (_, i) => ({ big: rand() < 0.55, x: rand() * cols, y: 2 + rand() * (rows * 0.75), v: 0.25 + rand() * 0.6, seed: i }));
      const flocks = Array.from({ length: 2 }, (_, i) => ({ x: rand() * cols, y: 4 + rand() * rows * 0.4, v: 1.6 + rand(), n: 3 + Math.floor(rand() * 3), seed: i }));
      return (api, t) => {
        for (const cl of clouds) {
          const cells = cl.big ? CLOUD_BIG : CLOUD_SMALL;
          const w = cl.big ? 20 : 11;
          const x = ((cl.x + t * cl.v) % (cols + w)) - w;
          for (const [cx, cy] of cells) api.tile(Math.round(x) + cx, Math.round(cl.y) + cy, c.cloud, c.ink, cl.seed * 97 + cx * 7 + cy);
        }
        for (const f of flocks) {
          const x = ((f.x + t * f.v) % (cols + 12)) - 6;
          for (let k = 0; k < f.n; k++) {
            const flap = Math.sin(t * 6 + k + f.seed) > 0;
            api.glyph(Math.round(x - k * 2), Math.round(f.y + Math.abs(k - f.n / 2) * 0.8 + Math.sin(t * 0.7 + f.seed) * 1.5), flap ? 'v' : '^', c.bird);
          }
        }
      };
    },
  },
  {
    id: 'jellyfish',
    name: tr('Jellyfish'),
    grid: true,
    colors: {
      dark: { sky: ['#04101d', '#0b2b47'], jellies: [['#8b6fc6', '#c5b3ee'], ['#e98aae', '#ffc3d8'], ['#f2a06f', '#ffd0b3']], bubble: '#6ea6d2', grid: 'rgb(120 180 255 / 0.05)' },
      light: { sky: ['#6fc3e6', '#d6f0fb'], jellies: [['#a48be0', '#6b52a8'], ['#f39ac0', '#b4507c'], ['#f7b48a', '#b06a3d']], bubble: '#ffffff', grid: 'rgb(255 255 255 / 0.18)' },
    },
    make(cols, rows, c) {
      const rand = seeded(23);
      const jellies = Array.from({ length: Math.max(3, Math.round(cols / 30)) }, (_, i) => ({ x: 4 + rand() * (cols - 18), y: rand() * rows, v: 0.6 + rand() * 0.7, phase: rand() * 6, kind: i % 3, len: 7 + Math.floor(rand() * 5) }));
      const bubbles = Array.from({ length: Math.round(cols / 4) }, () => ({ x: rand() * cols, y: rand() * rows, v: 1 + rand() * 2 }));
      return (api, t) => {
        for (const b of bubbles) api.glyph(Math.round(b.x + Math.sin(t + b.x) * 0.6), Math.round((((b.y - t * b.v) % rows) + rows) % rows), 'o', c.bubble, 0.55);
        for (const j of jellies) {
          // it swims in pulses: a push, then a glide
          const pulse = (t * 0.55 + j.phase) % 1;
          const rise = (t * 0.55 + j.phase - pulse) * 3.2 + (1 - (1 - pulse) ** 3) * 3.2;
          const y = Math.round(rows + 8 - ((j.y + rise * j.v) % (rows + 26)));
          const x = Math.round(j.x + Math.sin(t * 0.3 + j.phase) * 3);
          const [body, ink] = c.jellies[j.kind];
          for (const [bx, by, ch] of JELLY_BELL) api.tile(x + bx, y + by, body, ink, bx * 13 + by + j.kind, ch === '-' ? 0.75 : 1);
          for (let k = 0; k < 6; k++) {
            const tx = 1 + k * 2;
            for (let r = 0; r < j.len - (k % 2) * 2; r++) {
              const sway = Math.round(Math.sin(t * 2.2 + r * 0.55 + k) * (r / j.len) * 1.6);
              api.tile(x + tx + sway, y + 6 + r, body, ink, k * 31 + r, 0.85 - r / (j.len * 1.6));
            }
          }
        }
      };
    },
  },
  {
    id: 'koi',
    name: tr('Koi pond'),
    colors: {
      light: { sky: ['#8fd8c9', '#dff4ec'], orange: '#ef7a3c', white: '#fdf9f1', black: '#2c2c2c', ink: '#c9b9a4', lily: '#3f9a5d', lilyInk: '#2d6f43', flower: '#f6a4c6', ripple: 'rgb(255 255 255 / 0.5)' },
      dark: { sky: ['#06231f', '#0f3c37'], orange: '#e36a2e', white: '#e8e1d2', black: '#151515', ink: '#8a7d6c', lily: '#2a6b40', lilyInk: '#1b4a2c', flower: '#d77ea4', ripple: 'rgb(180 255 230 / 0.12)' },
    },
    make(cols, rows, c) {
      const rand = seeded(37);
      const fish = Array.from({ length: Math.max(3, Math.round(cols / 28)) }, () => ({ x: rand() * cols, y: 4 + rand() * (rows - 10), v: (rand() < 0.5 ? -1 : 1) * (1.5 + rand() * 1.5), wob: rand() * 6, spots: rand() }));
      const pads = Array.from({ length: Math.max(3, Math.round(cols / 24)) }, () => ({ x: Math.floor(rand() * (cols - 7)), y: Math.floor(rand() * (rows - 5)), flower: rand() < 0.45 }));
      return (api, t) => {
        for (let k = 0; k < 6; k++) {
          const rx = Math.round(hash(k, 3) * cols);
          const ry = Math.round(hash(k, 4) * rows);
          const r = ((t * 1.2 + k * 1.7) % 6) + 1;
          for (let a = 0; a < 16; a++) api.glyph(Math.round(rx + Math.cos(a / 2.55) * r * 2), Math.round(ry + Math.sin(a / 2.55) * r), '.', c.ripple, 1 - r / 7);
        }
        for (const f of fish) {
          const span = cols + KOI_W * 2;
          const x = Math.round(((((f.x + t * f.v) % span) + span) % span) - KOI_W);
          const y = Math.round(f.y + Math.sin(t * 0.6 + f.wob) * 2.5);
          const left = f.v < 0;
          for (const [kx, ky, ch] of KOI_MASK) {
            // the tail swishes up and down
            const tail = kx < 4 ? Math.round(Math.sin(t * 5 + f.wob) * 0.8) : 0;
            const px = left ? x + KOI_W - 1 - kx : x + kx;
            const color = ch === 'o' ? (hash(kx, ky, Math.floor(f.spots * 9)) < 0.85 ? c.orange : c.black) : ch === 'e' ? c.black : c.white;
            api.tile(px, y + ky + tail, color, c.ink, kx * 7 + ky);
          }
        }
        for (const p of pads) {
          for (const [px, py] of LILY) api.tile(p.x + px, p.y + py, c.lily, c.lilyInk, px + py * 7);
          if (p.flower) for (const [fx, fy] of FLOWER) api.tile(p.x + 2 + fx, p.y + 1 + fy, c.flower, c.lilyInk, fx + fy);
        }
      };
    },
  },
  {
    id: 'fireflies',
    name: tr('Fireflies'),
    colors: {
      dark: { sky: ['#020806', '#0b2117'], grass: '#1c4a31', grassInk: '#2f6b48', fly: '#e8ff8c', far: '#18382a' },
      light: { sky: ['#f3e2c2', '#c9ddb2'], grass: '#7aa35a', grassInk: '#557d3c', fly: '#d19a00', far: '#a9c08c' },
    },
    make(cols, rows, c) {
      const rand = seeded(41);
      const flies = Array.from({ length: Math.round(cols / 3) }, () => ({ x: rand() * cols, y: rows * 0.25 + rand() * rows * 0.65, a: rand() * 6, s: 0.3 + rand() * 0.6 }));
      const blades = Array.from({ length: cols }, (_, x) => 2 + Math.floor(hash(x, 7) * 6 + Math.sin(x * 0.3) * 2));
      return (api, t) => {
        for (let x = 0; x < cols; x++) {
          const far = 3 + Math.round(Math.sin(x * 0.11) * 2 + 2);
          for (let r = 0; r < far; r++) api.tile(x, rows - 4 - r, c.far, c.far, x + r, 0.7);
        }
        for (const f of flies) {
          const x = f.x + Math.sin(t * f.s + f.a) * 4 + Math.sin(t * f.s * 2.3) * 1.5;
          const y = f.y + Math.cos(t * f.s * 0.8 + f.a) * 3;
          const blink = Math.max(0, Math.sin(t * 1.7 * f.s + f.a * 3)) ** 3;
          if (blink > 0.05) api.glow(x, y, c.fly, 2.2, blink);
        }
        for (let x = 0; x < cols; x++) {
          const h = blades[x];
          for (let r = 0; r < h; r++) {
            const sway = Math.round(Math.sin(t * 1.3 + x * 0.25) * (r / h) * 1.2);
            api.tile(x + sway, rows - 1 - r, c.grass, c.grassInk, x * 5 + r);
          }
        }
      };
    },
  },
  {
    id: 'moonlit',
    name: tr('Moonlit night'),
    colors: {
      dark: { sky: ['#040920', '#18244e'], moon: '#f1edd5', crater: '#cbc4a2', ink: '#a39d82', star: '#ffffff', cloud: '#222f58', cloudInk: '#2f3d6b' },
      light: { sky: ['#b9c9ee', '#f2e2ee'], moon: '#ffffff', crater: '#e4e4f0', ink: '#c3c6dc', star: '#7d86b8', cloud: '#e8ecfa', cloudInk: '#c9d0ea' },
    },
    make(cols, rows, c) {
      const rand = seeded(53);
      const stars = Array.from({ length: Math.round((cols * rows) / 40) }, () => ({ x: Math.floor(rand() * cols), y: Math.floor(rand() * rows * 0.85), a: rand() * 6, big: rand() < 0.15 }));
      const clouds = Array.from({ length: 3 }, (_, i) => ({ x: rand() * cols, y: rows * 0.15 + rand() * rows * 0.5, v: 0.15 + rand() * 0.2, seed: i }));
      const mx = Math.round(cols * 0.72);
      const my = Math.round(rows * 0.16);
      return (api, t) => {
        for (const s of stars) {
          const tw = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.4 + s.a)) ** 2;
          api.glyph(s.x, s.y, s.big ? '*' : '.', c.star, tw);
        }
        api.glow(mx + 6, my + 6, c.moon, 14, 0.18);
        for (const [x, y, ch] of MOON) api.tile(mx + x, my + y, ch === 'c' ? c.crater : c.moon, c.ink, x * 3 + y);
        for (const cl of clouds) {
          const x = ((cl.x + t * cl.v) % (cols + 20)) - 20;
          for (const [cx, cy] of CLOUD_BIG) api.tile(Math.round(x) + cx, Math.round(cl.y) + cy, c.cloud, c.cloudInk, cx + cy * 5 + cl.seed, 0.85);
        }
      };
    },
  },
  {
    id: 'boats',
    name: tr('Paper boats'),
    colors: {
      light: { sky: ['#78c4d4', '#d1eff3'], boat: '#fffdf6', sail: '#f3efe2', ink: '#b8c6c9', wave: '#5aaabc' },
      dark: { sky: ['#071c27', '#103343'], boat: '#d9d6c8', sail: '#c4c0b0', ink: '#7d8a8e', wave: '#2a6378' },
    },
    make(cols, rows, c) {
      const rand = seeded(67);
      const lanes = Array.from({ length: Math.max(4, Math.round(rows / 7)) }, (_, i) => Math.round(((i + 1) / (Math.round(rows / 7) + 1)) * rows));
      const boats = Array.from({ length: Math.max(4, Math.round(cols / 22)) }, (_, i) => ({ lane: lanes[i % lanes.length], x: rand() * cols, v: 0.6 + rand() * 0.9, a: rand() * 6 }));
      return (api, t) => {
        for (const y of lanes) for (let x = 0; x < cols; x++) {
          const w = Math.sin(x * 0.35 - t * 1.6 + y);
          if (w > 0.55) api.glyph(x, y + 2, '~', c.wave, (w - 0.55) * 2);
        }
        for (const b of boats) {
          const x = Math.round(((b.x + t * b.v) % (cols + 10)) - 10);
          const bob = Math.round(Math.sin(t * 1.6 + b.a) * 0.7);
          for (const [bx, by, ch] of BOAT) api.tile(x + bx, b.lane - 4 + by + bob, ch === 's' ? c.sail : c.boat, c.ink, bx + by * 9);
        }
      };
    },
  },
  {
    id: 'turtle',
    name: tr('Sea turtle'),
    colors: {
      light: { sky: ['#5ccdd3', '#c3f1e5'], sand: '#efd9a6', sandInk: '#d6bd83', shell: '#5d8c3c', plate: '#86b65c', head: '#9cc472', ink: '#3f6626', light: 'rgb(255 255 255 / 0.35)' },
      dark: { sky: ['#03222a', '#0c4750'], sand: '#5c5236', sandInk: '#6f6445', shell: '#3e6327', plate: '#58833a', head: '#6f9a4c', ink: '#2a4519', light: 'rgb(170 255 240 / 0.08)' },
    },
    make(cols, rows, c) {
      const rand = seeded(79);
      const turtles = Array.from({ length: Math.max(2, Math.round(cols / 45)) }, () => ({ x: rand() * cols, y: 4 + rand() * (rows - 18), v: 0.9 + rand() * 0.6, a: rand() * 6 }));
      return (api, t) => {
        // light falling through the water, in slanting rays
        for (let k = 0; k < 5; k++) {
          const base = ((k * cols) / 5 + t * 0.8) % (cols + 20);
          for (let y = 0; y < rows * 0.7; y += 2) api.glyph(Math.round(base - y * 0.5), y, ':', c.light, 1 - y / (rows * 0.7));
        }
        for (let x = 0; x < cols; x++) {
          const h = 3 + Math.round(Math.sin(x * 0.12) * 1.5 + hash(x, 2));
          for (let r = 0; r < h; r++) api.tile(x, rows - 1 - r, c.sand, c.sandInk, x * 3 + r);
        }
        for (const tu of turtles) {
          const x = Math.round(((tu.x + t * tu.v) % (cols + 20)) - 18);
          const y = Math.round(tu.y + Math.sin(t * 0.4 + tu.a) * 3);
          const cells = Math.sin(t * 2 + tu.a) > 0 ? TURTLE_A : TURTLE_B;
          for (const [tx, ty, ch] of cells) api.tile(x + tx, y + ty, ch === 's' ? c.plate : ch === 'h' || ch === 'f' ? c.head : c.shell, c.ink, tx * 5 + ty);
        }
      };
    },
  },
  {
    id: 'rain',
    name: tr('Rain'),
    grid: true,
    colors: {
      dark: { sky: ['#0a0f15', '#1b2633'], drop: '#8fb5d8', splash: '#b9d4ec', grid: 'rgb(150 190 230 / 0.04)' },
      light: { sky: ['#c4cfd9', '#eef2f6'], drop: '#5f7f9e', splash: '#7f9bb6', grid: 'rgb(60 90 120 / 0.06)' },
    },
    make(cols, rows, c) {
      const rand = seeded(97);
      const drops = Array.from({ length: Math.round(cols * 0.7) }, () => ({ x: Math.floor(rand() * cols), y: rand() * rows, v: 14 + rand() * 12 }));
      return (api, t) => {
        for (const d of drops) {
          const y = (d.y + t * d.v) % (rows + 6);
          for (let k = 0; k < 3; k++) api.glyph(d.x, Math.round(y) - k, '|', c.drop, 0.8 - k * 0.25);
          if (y > rows - 1.2) {
            api.glyph(d.x - 1, rows - 1, '.', c.splash, 0.8);
            api.glyph(d.x + 1, rows - 1, '.', c.splash, 0.8);
          }
        }
      };
    },
  },
];

export const NONE = 'none';
export const sceneOf = (id) => SCENES.find((s) => s.id === id) ?? null;
