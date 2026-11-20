import { canMove, fxDpr } from './gate';

// A word as a cloud of grains of dust that hold the shape of its letters (the portfolio's footer name works the same way).
// They gather out of a scatter, shy away from the pointer or a finger (turning the hot colour as they go) and burst outwards
// on a tap before settling back. Drawn on a 2D canvas that fills its parent; it sleeps when everything is still.

/**
 * Starts the dust on `canvas` (its parent gives the size). `text` is drawn centred, in `font` (a CSS font without the size:
 * the size is fitted to the box, at most `maxSize` px). Returns { burst(x, y), dispose() } or null with less motion asked for.
 */
export const createParticleText = (canvas, { text, font = '600 {size}px system-ui, sans-serif', maxSize = 220, colors = ['#ece6da', '#ff5b2e'], density = 1, onTap } = {}) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !canMove()) return null;
  const [base, hot] = colors;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let grains = [];
  let gather = 0;
  let raf = 0;
  let still = 0;
  let born = performance.now();
  const pointer = { x: -9999, y: -9999 };

  let gone = false;
  const build = () => {
    // the fonts can finish loading, or the box change size, after the dust was taken away
    if (gone || !canvas.parentElement) return;
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = fxDpr(2);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const off = document.createElement('canvas');
    off.width = Math.ceil(w);
    off.height = Math.ceil(h);
    const o = off.getContext('2d', { willReadFrequently: true });
    // the biggest size at which the word fits across 90% of the box and 60% of its height
    let size = Math.min(maxSize, h * 0.6);
    o.font = font.replace('{size}', size);
    const width = o.measureText(text).width;
    if (width > w * 0.9) size *= (w * 0.9) / width;
    o.font = font.replace('{size}', size);
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.fillStyle = '#000';
    o.fillText(text, w / 2, h / 2);
    const data = o.getImageData(0, 0, off.width, off.height).data;
    const step = Math.max(2, Math.round(size / (34 * density)));
    const next = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 128) {
          const old = grains[next.length];
          next.push({
            hx: x + (Math.random() - 0.5) * step * 0.9,
            hy: y + (Math.random() - 0.5) * step * 0.9,
            x: old?.x ?? Math.random() * w,
            y: old?.y ?? Math.random() * h,
            vx: 0,
            vy: 0,
            heat: 0,
            size: step * (0.45 + Math.random() * 0.35),
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }
    grains = next;
    wake();
  };

  let prev = performance.now();
  const frame = (now) => {
    raf = 0;
    if (gone) return;
    const dt = Math.min(0.033, (now - prev) / 1000);
    prev = now;
    gather = Math.min(1, (now - born) / 2200);
    const ease = 1 - (1 - gather) ** 3;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let moving = 0;
    for (let i = 0; i < grains.length; i += 1) {
      const g = grains[i];
      // before it has gathered, a grain's home is a point on a slow spiral round the word
      const tx = g.hx + Math.cos(g.phase + now / 900) * (1 - ease) * w * 0.4;
      const ty = g.hy + Math.sin(g.phase + now / 900) * (1 - ease) * h * 0.4;
      let ax = (tx - g.x) * 38;
      let ay = (ty - g.y) * 38;
      const dx = g.x - pointer.x;
      const dy = g.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 100 * 100) {
        const d = Math.sqrt(d2) || 1;
        const push = (1 - d / 100) * 8000;
        ax += (dx / d) * push;
        ay += (dy / d) * push;
        g.heat = Math.min(1, g.heat + dt * 6);
      }
      g.vx = (g.vx + ax * dt) * 0.86;
      g.vy = (g.vy + ay * dt) * 0.86;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.heat = Math.max(0, g.heat - dt * 1.2);
      const speed = Math.hypot(g.vx, g.vy);
      if (speed > 4 || g.heat > 0.02) moving += 1;
      const k = Math.max(g.heat, Math.min(1, speed / 900));
      ctx.globalAlpha = 0.6 + 0.4 * (1 - k);
      ctx.fillStyle = k > 0.3 ? hot : base;
      const s = g.size * (1 + k * 0.6);
      ctx.fillRect(g.x - s / 2, g.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    still = moving || gather < 1 ? 0 : still + dt;
    if (still < 0.6) raf = requestAnimationFrame(frame);
  };
  function wake() {
    if (!raf) {
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const host = canvas.parentElement;
  const onMove = (e) => {
    Object.assign(pointer, local(e));
    still = 0;
    wake();
  };
  const onLeave = () => {
    pointer.x = -9999;
    pointer.y = -9999;
  };
  const kick = (px, py) => {
    grains.forEach((g) => {
      const dx = g.x - px;
      const dy = g.y - py;
      const d = Math.hypot(dx, dy) || 1;
      const force = 2400 * Math.max(0.15, 1 - d / (w * 0.6));
      g.vx += (dx / d) * force + (Math.random() - 0.5) * 600;
      g.vy += (dy / d) * force + (Math.random() - 0.5) * 600;
      g.heat = 1;
    });
    wake();
  };
  const onDown = (e) => {
    const p = local(e);
    kick(p.x, p.y);
    onTap?.(e);
  };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);
  host.addEventListener('pointerdown', onDown);
  const ro = new ResizeObserver(build);
  ro.observe(host);
  build();
  document.fonts?.ready.then(build);

  return {
    burst: kick,
    /** Gathers the word again from a scatter (when it is shown anew). */
    regather() {
      born = performance.now();
      grains.forEach((g) => {
        g.x = Math.random() * w;
        g.y = Math.random() * h;
      });
      wake();
    },
    dispose() {
      gone = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
    },
  };
};
