// Drawing on a canvas in the notebook's style, for the games that move too fast for SVG: the squared page, and lines with a
// little wobble so they look drawn in ballpoint like the rest of "Ra chơi".

export const PAGE = '#fdfaf0';

/** Sizes a canvas to its box at the screen's density; returns its width and height in CSS pixels. */
export const fitCanvas = (canvas) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
};

/** The squared page, scrolled sideways by `offset` (for a page that seems to move). */
export const drawPage = (ctx, w, h, offset = 0, square = 22) => {
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,150,210,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -(offset % square); x < w; x += square) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = square; y < h; y += square) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
};

/** A rectangle drawn twice, a hair apart, like a pen going round it. */
export const penRect = (ctx, x, y, w, h, { stroke, fill, seed = 0 }) => {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  const j = ((seed * 7) % 3) * 0.4 - 0.4;
  ctx.strokeRect(x - 0.8 + j, y + 0.9, w + 1.2, h - 1.4);
  ctx.globalAlpha = 1;
};

/** Words written on the page, centred. */
export const penText = (ctx, text, x, y, { size = 28, color = '#2c3aa8', font = 'cursive' } = {}) => {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
};

/** The handwriting font the page uses, read from the document so the canvas matches it. */
export const penFont = () => {
  if (typeof document === 'undefined') return 'cursive';
  const probe = document.querySelector('.font-pen');
  return probe ? getComputedStyle(probe).fontFamily : 'cursive';
};
