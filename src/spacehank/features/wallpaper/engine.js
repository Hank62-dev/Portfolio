// Draws a wallpaper scene (scenes.js) on a canvas: the background once per size, then every frame the scene's tiles. A tile
// is a small square with a typewritten character on it; each different tile is drawn once into a cache and stamped from
// there, so a frame of a few thousand tiles stays cheap. It draws about 24 frames a second, sleeps while the page is hidden,
// and, for someone who asked for less motion, draws one still frame.

const GLYPHS = 't%:;t%:';
const FPS = 24;

const tileHash = (seed, flick) => {
  let h = Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(flick, 40503);
  h ^= h >>> 15;
  return (h >>> 0) % GLYPHS.length;
};

/**
 * Starts `scene` on `canvas` (sized to its own box) for `theme` ('dark' | 'light'). `cell` is the tile size in CSS px. `still`
 * draws one frame and stops. Returns { dispose }.
 */
export const createWallpaper = (canvas, scene, theme, { cell = 12, still = false, time = 6 } = {}) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !scene) return { dispose() {} };
  const colors = scene.colors[theme] ?? scene.colors.dark ?? scene.colors.light;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let draw = null;
  let back = null;
  const cache = new Map();
  let raf = 0;
  let last = 0;
  const start = performance.now() - time * 1000;

  const size = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    cols = Math.ceil(r.width / cell);
    rows = Math.ceil(r.height / cell);
    cache.clear();
    draw = scene.make(cols, rows, colors);
    // the background: the sky's gradient, and a faint grid for the scenes that have one
    back = document.createElement('canvas');
    back.width = canvas.width;
    back.height = canvas.height;
    const b = back.getContext('2d');
    const g = b.createLinearGradient(0, 0, 0, back.height);
    g.addColorStop(0, colors.sky[0]);
    g.addColorStop(1, colors.sky[1]);
    b.fillStyle = g;
    b.fillRect(0, 0, back.width, back.height);
    if (scene.grid && colors.grid) {
      b.strokeStyle = colors.grid;
      b.lineWidth = 1;
      b.beginPath();
      for (let x = 0; x <= cols; x++) {
        b.moveTo(Math.round(x * cell * dpr) + 0.5, 0);
        b.lineTo(Math.round(x * cell * dpr) + 0.5, back.height);
      }
      for (let y = 0; y <= rows; y++) {
        b.moveTo(0, Math.round(y * cell * dpr) + 0.5);
        b.lineTo(back.width, Math.round(y * cell * dpr) + 0.5);
      }
      b.stroke();
    }
  };

  const stampOf = (key, paint) => {
    let s = cache.get(key);
    if (!s) {
      const size = Math.round(cell * dpr);
      s = document.createElement('canvas');
      s.width = size;
      s.height = size;
      paint(s.getContext('2d'), size);
      cache.set(key, s);
    }
    return s;
  };
  const font = (size) => `600 ${Math.round(size * 0.66)}px ui-monospace, 'Geist Mono', Menlo, monospace`;

  let flick = 0;
  const api = {
    tile(x, y, color, ink, seed = 0, alpha = 1) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      const ch = GLYPHS[tileHash(seed | 0, flick + ((seed * 7) % 5))];
      const stamp = stampOf(`t|${color}|${ink}|${ch}`, (c, size) => {
        const gap = Math.max(1, Math.round(size * 0.08));
        c.fillStyle = color;
        c.fillRect(gap / 2, gap / 2, size - gap, size - gap);
        c.fillStyle = ink;
        c.font = font(size);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(ch, size / 2, size / 2 + size * 0.04);
      });
      ctx.globalAlpha = alpha;
      ctx.drawImage(stamp, Math.round(x * cell * dpr), Math.round(y * cell * dpr));
    },
    glyph(x, y, ch, color, alpha = 1) {
      if (x < 0 || y < 0 || x >= cols || y >= rows || alpha <= 0) return;
      const stamp = stampOf(`g|${color}|${ch}`, (c, size) => {
        c.fillStyle = color;
        c.font = font(size * 1.15);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(ch, size / 2, size / 2);
      });
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(stamp, Math.round(x * cell * dpr), Math.round(y * cell * dpr));
    },
    glow(x, y, color, size, alpha = 1) {
      const r = size * cell * dpr;
      const cx = (x + 0.5) * cell * dpr;
      const cy = (y + 0.5) * cell * dpr;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, color);
      g.addColorStop(0.18, color);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    },
  };

  const frame = (now) => {
    raf = 0;
    if (!document.hidden) {
      const t = (now - start) / 1000;
      // the characters change now and then, a few at a time, so the mosaic shimmers
      flick = Math.floor(t * 0.7);
      ctx.globalAlpha = 1;
      ctx.drawImage(back, 0, 0);
      draw(api, t);
      ctx.globalAlpha = 1;
    }
    if (!still) raf = requestAnimationFrame(tick);
  };
  const tick = (now) => {
    raf = 0;
    if (now - last >= 1000 / FPS - 2) {
      last = now;
      frame(now);
    } else raf = requestAnimationFrame(tick);
  };

  size();
  frame(performance.now());
  const ro = new ResizeObserver(() => {
    size();
    if (still) frame(performance.now());
  });
  ro.observe(canvas);
  const onVisible = () => {
    if (!document.hidden && !still && !raf) raf = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', onVisible);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      cache.clear();
    },
  };
};
