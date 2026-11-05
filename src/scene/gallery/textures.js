import * as THREE from 'three';
import { wrapText } from './layout';

// Everything the gallery says in words is drawn onto canvas textures: DOM text does not exist inside a
// headset, and this keeps the scene self-contained (no font or image requests beyond the covers).

export const SERIF = '400 {size}px "Newsreader", serif';
export const MONO = '500 {size}px "Geist Mono", ui-monospace, Menlo, monospace';
export const SANS = '400 {size}px "Geist", system-ui, sans-serif';

const font = (family, size) => family.replace('{size}', String(size));

/** Loads the faces used above, so canvas text is drawn in them rather than in a fallback. */
export const loadGalleryFonts = () =>
  Promise.all([font(SERIF, 64), font(MONO, 24), font(SANS, 28)].map((f) => document.fonts?.load(f))).catch(() => undefined);

const toTexture = (canvas) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const makeCanvas = (w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
};

/** A cover for a project that has no screenshot: its name, in the site's own type, on the dark wash. */
export const makeCoverTexture = ({ name, kind, tags }) => {
  // drawn on a 1600 x 1000 plan, stored at 1024 x 640 to keep the texture memory down
  const [canvas, ctx] = makeCanvas(1024, 640);
  ctx.scale(0.64, 0.64);
  const wash = ctx.createLinearGradient(0, 0, 1600, 1000);
  wash.addColorStop(0, '#16181c');
  wash.addColorStop(1, '#0b0c0e');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1600, 1000);

  // the layer motif: four stacked rhombi
  ctx.strokeStyle = 'rgba(236,230,218,0.16)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const cy = 330 + i * 110;
    ctx.beginPath();
    ctx.moveTo(1180, cy - 70);
    ctx.lineTo(1480, cy);
    ctx.lineTo(1180, cy + 70);
    ctx.lineTo(880, cy);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = '#ff5b2e';
  ctx.fillRect(1177, 240, 6, 540);

  ctx.fillStyle = '#ff5b2e';
  ctx.font = font(MONO, 30);
  ctx.fillText(kind.toUpperCase(), 100, 150);
  ctx.fillStyle = '#ece6da';
  ctx.font = font(SERIF, name.length > 12 ? 150 : 190);
  ctx.fillText(name, 100, 560);
  ctx.font = font(MONO, 28);
  ctx.fillStyle = '#a8a396';
  ctx.fillText(tags.slice(0, 4).join('  ·  '), 100, 880);
  return toTexture(canvas);
};

/** The label under a frame. */
export const makePlaqueTexture = ({ index, count, name, year, kind }) => {
  const [canvas, ctx] = makeCanvas(1200, 220);
  ctx.fillStyle = '#0d0e11';
  ctx.fillRect(0, 0, 1200, 220);
  ctx.fillStyle = '#ff5b2e';
  ctx.font = font(MONO, 30);
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`, 40, 70);
  ctx.fillStyle = '#ece6da';
  ctx.font = font(SERIF, 84);
  ctx.fillText(name, 40, 160);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a8a396';
  ctx.font = font(MONO, 28);
  ctx.fillText(String(year), 1160, 70);
  ctx.fillText(kind.length > 34 ? `${kind.slice(0, 33)}…` : kind, 1160, 160);
  return toTexture(canvas);
};

/** The reading board that appears beside the frame being looked at. */
export const makeBoardTexture = ({ name, tagline, summary, stack, hint }) => {
  const [canvas, ctx] = makeCanvas(1024, 1100);
  ctx.fillStyle = '#0d0e11';
  ctx.fillRect(0, 0, 1024, 1100);
  ctx.strokeStyle = 'rgba(255,91,46,0.7)';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 996, 1072);

  ctx.fillStyle = '#ece6da';
  ctx.font = font(SERIF, 96);
  ctx.fillText(name, 60, 150);
  ctx.fillStyle = '#ff5b2e';
  ctx.font = font(SANS, 38);
  wrapText(tagline, 38, 3).forEach((line, i) => ctx.fillText(line, 60, 230 + i * 50));

  ctx.fillStyle = '#c8c2b4';
  ctx.font = font(SANS, 34);
  wrapText(summary, 42, 8).forEach((line, i) => ctx.fillText(line, 60, 440 + i * 48));

  ctx.fillStyle = '#a8a396';
  ctx.font = font(MONO, 26);
  wrapText(stack.join('  ·  '), 52, 3).forEach((line, i) => ctx.fillText(line, 60, 900 + i * 40));
  ctx.fillStyle = '#ff5b2e';
  ctx.fillText(hint, 60, 1050);
  return toTexture(canvas);
};

/** A big sign: a zone's name over the nave, or the note on the end wall. */
export const makeSignTexture = ({ eyebrow, title, subtitle }) => {
  const [canvas, ctx] = makeCanvas(1600, 360);
  ctx.fillStyle = '#0d0e11';
  ctx.fillRect(0, 0, 1600, 360);
  ctx.strokeStyle = 'rgba(255,91,46,0.75)';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 1580, 340);
  ctx.fillStyle = '#ff5b2e';
  ctx.font = font(MONO, 34);
  ctx.fillText(eyebrow.toUpperCase(), 70, 90);
  ctx.fillStyle = '#ece6da';
  ctx.font = font(SERIF, 150);
  ctx.fillText(title, 70, 235, 1460);
  ctx.fillStyle = '#a8a396';
  ctx.font = font(MONO, 32);
  ctx.fillText(subtitle, 70, 310);
  return toTexture(canvas);
};

/** A soft warm pool of light, laid on the floor under each frame. */
export const makePoolTexture = () => {
  const [canvas, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,170,120,0.55)');
  g.addColorStop(0.5, 'rgba(255,91,46,0.16)');
  g.addColorStop(1, 'rgba(255,91,46,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return toTexture(canvas);
};
