import * as THREE from 'three';
import { paletteOf } from './layout';

// What hangs on the walls, drawn on canvases: a print for every work that has no picture of its own (an abstract composition
// in its own colours, with its name set like an exhibition poster), the small label beside each frame, and the title painted
// on the wall at the entrance.

const SERIF = (size, style = '') => `${style} 400 ${size}px "Newsreader", "Times New Roman", serif`;
const MONO = (size) => `500 ${size}px "Geist Mono", ui-monospace, Menlo, monospace`;
const SANS = (size, weight = 400) => `${weight} ${size}px "Geist", system-ui, sans-serif`;

/** Loads the faces the canvases use, so the words are not drawn in a fallback. */
export const loadPrintFonts = () =>
  Promise.all([SERIF(64), SERIF(64, 'italic'), MONO(24), SANS(28), SANS(28, 600)].map((f) => document.fonts?.load(f))).catch(() => undefined);

const canvasOf = (w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
};

const toTexture = (canvas) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const hashOf = (text) => {
  let h = 7;
  for (const ch of String(text)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/** Lines of `text` no wider than `width` in the context's current font. */
const lines = (ctx, text, width) => {
  const out = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
};

// Four compositions, chosen per work: a sun over a band, rings, a field of dots round a figure, and the stack's rhombi.
const COMPOSITIONS = [
  (ctx, p, W, H) => {
    ctx.fillStyle = p.main;
    ctx.beginPath();
    ctx.arc(W * 0.62, H * 0.34, W * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(W / 2, H * 0.5);
    ctx.rotate(-0.42);
    ctx.fillStyle = p.accent;
    ctx.fillRect(-W, -H * 0.05, W * 2, H * 0.1);
    ctx.restore();
  },
  (ctx, p, W, H) => {
    for (let i = 7; i >= 1; i -= 1) {
      ctx.fillStyle = i % 2 ? p.main : p.ground;
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.62, i * W * 0.075, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(W * 0.28, H * 0.22, W * 0.07, 0, Math.PI * 2);
    ctx.fill();
  },
  (ctx, p, W, H) => {
    ctx.fillStyle = p.accent;
    for (let y = 0; y < 14; y += 1) for (let x = 0; x < 10; x += 1) {
      ctx.globalAlpha = 0.25 + ((x * 7 + y * 3) % 5) / 8;
      ctx.beginPath();
      ctx.arc(W * 0.1 + x * W * 0.09, H * 0.08 + y * H * 0.05, W * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.main;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.12);
    ctx.lineTo(W * 0.85, H * 0.68);
    ctx.lineTo(W * 0.15, H * 0.68);
    ctx.closePath();
    ctx.fill();
  },
  (ctx, p, W, H) => {
    for (let i = 0; i < 4; i += 1) {
      const cy = H * 0.2 + i * H * 0.13;
      ctx.fillStyle = i === 1 ? p.accent : p.main;
      ctx.globalAlpha = i === 1 ? 1 : 0.85 - i * 0.12;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, cy - H * 0.07);
      ctx.lineTo(W * 0.86, cy);
      ctx.lineTo(W * 0.5, cy + H * 0.07);
      ctx.lineTo(W * 0.14, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
];

/** A print for a work with no picture: its composition, its number, its name and what it is, like a gallery poster (3:4). */
export const makePrint = ({ slug, name, year, kind }, number) => {
  const W = 900;
  const H = 1200;
  const [canvas, ctx] = canvasOf(W, H);
  const p = paletteOf(slug);
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, 0, W, H);
  COMPOSITIONS[hashOf(slug) % COMPOSITIONS.length](ctx, p, W, H);
  // paper grain
  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = `rgba(${i % 2 ? '255,255,255' : '0,0,0'},0.05)`;
    ctx.fillRect((i * 9301 + 49297) % W, (i * 4721 + 1931) % H, 2, 2);
  }
  ctx.fillStyle = p.ink;
  ctx.font = MONO(26);
  ctx.fillText(`No. ${String(number).padStart(2, '0')}`, 64, 92);
  ctx.textAlign = 'right';
  ctx.fillText(String(year), W - 64, 92);
  ctx.textAlign = 'left';
  ctx.font = SERIF(name.length > 14 ? 96 : 124);
  const title = lines(ctx, name, W - 128).slice(0, 2);
  title.forEach((line, i) => ctx.fillText(line, 60, H - 150 - (title.length - 1 - i) * 112));
  ctx.font = MONO(24);
  ctx.fillText(String(kind).toUpperCase().slice(0, 44), 64, H - 72);
  return toTexture(canvas);
};

/**
 * The wall text beside a frame, printed straight onto the wall as in a museum: the number and year, the name in italic, what it
 * is, a rule, the line about it, what it was made with, and an invitation to the case study (transparent, 1000 × 1400).
 */
export const makeWallText = ({ name, kind, year, tagline, tech = [] }, number, total, { no = 'No.', open = 'Open the case study' } = {}) => {
  const W = 1000;
  const H = 1400;
  const X = 20;
  const [canvas, ctx] = canvasOf(W, H);
  ctx.clearRect(0, 0, W, H);
  let y = 70;
  ctx.fillStyle = '#a8834c';
  ctx.font = MONO(34);
  ctx.fillText(`${no} ${String(number).padStart(2, '0')} / ${String(total).padStart(2, '0')}  —  ${year}`.toUpperCase(), X, y);
  y += 130;
  ctx.fillStyle = '#161514';
  ctx.font = SERIF(name.length > 18 ? 92 : 112, 'italic');
  for (const line of lines(ctx, name, W - X * 2).slice(0, 2)) {
    ctx.fillText(line, X, y);
    y += 112;
  }
  ctx.fillStyle = '#6b665d';
  ctx.font = SANS(42);
  for (const line of lines(ctx, String(kind), W - X * 2).slice(0, 2)) {
    ctx.fillText(line, X, y - 20);
    y += 54;
  }
  y += 20;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(X, y, 120, 3);
  y += 90;
  ctx.font = SERIF(56);
  ctx.fillStyle = '#25231f';
  const said = lines(ctx, String(tagline ?? ''), W - X * 2);
  said.slice(0, 6).forEach((line, i) => ctx.fillText(i === 5 && said.length > 6 ? `${line} …` : line, X, y + i * 74));
  y += Math.min(said.length, 6) * 74 + 40;
  if (tech.length) {
    ctx.font = MONO(33);
    ctx.fillStyle = '#5b574f';
    for (const line of lines(ctx, tech.join('  ·  '), W - X * 2).slice(0, 2)) {
      ctx.fillText(line, X, y);
      y += 50;
    }
  }
  // the way on to the case study, at the foot of the text
  ctx.font = MONO(34);
  ctx.fillStyle = '#161514';
  const label = `${open}  →`;
  const at = Math.min(y + 70, H - 60);
  ctx.fillText(label, X, at);
  ctx.fillRect(X, at + 20, ctx.measureText(label).width, 3);
  return toTexture(canvas);
};

/** The words painted on the wall at the entrance: a kicker, the title in large serif, a line under it. */
export const makeWallTitle = ({ kicker, title, line }) => {
  const W = 2400;
  const H = 900;
  const [canvas, ctx] = canvasOf(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = MONO(44);
  ctx.fillText(kicker.toUpperCase().split('').join(' '), 40, 120);
  ctx.font = SERIF(300);
  ctx.fillText(title, 24, 450);
  ctx.font = SERIF(300, 'italic');
  ctx.fillStyle = '#b08d57';
  ctx.fillText(line, 24, 760);
  return toTexture(canvas);
};
