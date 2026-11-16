import { useEffect, useRef } from 'react';
import { useTheme } from '../../../shared/lib/theme';
import { gsap, prefersReducedMotion } from '../../motion/gsap';

const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return h.length === 6 ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : [255, 91, 46];
};

/**
 * The night sky the whispers burn on: a field of stars that drifts with the pointer and a flame for every
 * whisper, each flickering on its own beat, the newest burning hottest. `getState()` gives the flames to
 * draw ({ x, y, id } in 0..1), the one hovered, and a pending one (where a new whisper is being written).
 * Decorative: the whispers themselves are listed for assistive technology next to it.
 */
export default function Sky({ getState }) {
  const canvas = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const el = canvas.current;
    const ctx = el.getContext('2d');
    if (!ctx) return undefined;
    const reduced = prefersReducedMotion();
    const signal = rgb(token('--color-signal', '#ff5b2e'));
    const bone = rgb(token('--color-bone', '#ece6da'));
    const light = theme === 'light';
    let w = 0;
    let h = 0;
    let dpr = 1;
    const stars = Array.from({ length: 240 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() ** 3 * 1.6 + 0.3, depth: Math.random(), phase: Math.random() * 6.28 }));
    const pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
    // how far each flame has been lit: 0 when it first appears, rising to 1
    const lit = new Map();
    let time = 0;
    let visible = false;

    const resize = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
    };

    const flame = (x, y, size, heat, seed) => {
      // the glow on the sky, then a teardrop that sways, then its white-hot core
      const flick = reduced ? 1 : 0.85 + Math.sin(time * 9 + seed) * 0.08 + Math.sin(time * 23 + seed * 3) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 7 * flick);
      glow.addColorStop(0, `rgba(${signal},${0.38 * heat})`);
      glow.addColorStop(1, `rgba(${signal},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, size * 7 * flick, 0, Math.PI * 2);
      ctx.fill();
      const sway = reduced ? 0 : Math.sin(time * 3.1 + seed) * size * 0.35;
      const tall = size * 2.6 * flick;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.bezierCurveTo(x - size, y - tall * 0.55, x + sway * 0.5, y - tall * 0.7, x + sway, y - tall);
      ctx.bezierCurveTo(x + sway * 0.5 + size * 0.3, y - tall * 0.6, x + size, y - tall * 0.45, x + size, y);
      ctx.arc(x, y, size, 0, Math.PI);
      ctx.fillStyle = `rgba(${signal},${0.95 * heat})`;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.15, size * 0.45, size * 0.8 * flick, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,236,200,${0.9 * heat})`;
      ctx.fill();
    };

    const draw = (dt) => {
      time += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 3);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 3);
      const ox = (pointer.sx - 0.5) * 24;
      const oy = (pointer.sy - 0.5) * 16;
      stars.forEach((s) => {
        const tw = reduced ? 0.7 : 0.45 + Math.sin(time * (0.8 + s.depth) + s.phase) * 0.35;
        ctx.fillStyle = light ? `rgba(${bone},${tw * 0.35})` : `rgba(${bone},${tw * 0.8})`;
        ctx.beginPath();
        ctx.arc(((s.x * w - ox * s.depth) % w + w) % w, ((s.y * h - oy * s.depth) % h + h) % h, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      const { flames, hovered, pending } = getState();
      const seen = new Set();
      flames.forEach((f, i) => {
        seen.add(f.id);
        const was = lit.get(f.id) ?? (reduced ? 1 : 0);
        const now = Math.min(1, was + dt * 0.9);
        lit.set(f.id, now);
        const ignite = 1 - (1 - now) ** 3;
        const heat = (0.55 + 0.45 * Math.max(0, 1 - i / 12)) * ignite;
        const size = (f.id === hovered ? 6.5 : 4.5) * (0.6 + ignite * 0.4);
        flame(f.x * w, f.y * h, size, heat, i * 1.7);
      });
      for (const id of lit.keys()) if (!seen.has(id)) lit.delete(id);
      if (pending) flame(pending.x * w, pending.y * h, 4 + Math.sin(time * 4) * 0.8, 0.55, 99);
    };

    resize();
    draw(0);
    const ro = new ResizeObserver(() => {
      resize();
      draw(0);
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const tick = (_, ms) => visible && draw(Math.min(0.05, ms / 1000));
    gsap.ticker.add(tick);
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = (e.clientY - r.top) / r.height;
    };
    el.addEventListener('pointermove', onMove);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
    };
  }, [getState, theme]);

  return <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden="true" />;
}
