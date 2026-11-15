import { useEffect, useRef } from 'react';
import { useLang } from '../../i18n';
import { formatDate } from '../../../shared/lib/format';
import { useTheme } from '../../../shared/lib/theme';
import { gsap, prefersReducedMotion } from '../../motion/gsap';

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const toRgb = (color) => {
  const hex = color.replace('#', '');
  if (hex.length === 6) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = color.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [255, 91, 46];
};
const shade = ([r, g, b], k, a = 1) => `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`;

/**
 * The year of contributions as a city: one block per day, as tall as the day was busy, weeks running
 * away to the right. It rises in a wave from the oldest week when it comes into view, and the blocks
 * round the pointer lift a little. Decorative: the flat grid with its readable cells is kept for
 * assistive technology (and for phones, where this is not drawn).
 */
export default function Skyline({ cells, weeks }) {
  const canvas = useRef(null);
  const { theme } = useTheme();
  const { lang } = useLang();

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!ctx || !cells.length) return undefined;
    const reduced = prefersReducedMotion();
    const signal = toRgb(token('--color-signal') || '#ff5b2e');
    const empty = token('--color-ink-3') || '#1e2127';
    const bone = token('--color-bone') || '#ece6da';
    const ink = token('--color-ink-0') || '#0b0c0e';
    const mono = token('--font-mono') || 'monospace';
    const max = Math.max(...cells.map((d) => d.count), 1);
    // draw order: far weeks first, and within a week the top row first
    const order = [...cells].sort((a, b) => b.col - a.col || a.row - b.row);
    const lift = new Float32Array(cells.length);
    const indexOf = new Map(cells.map((d, i) => [d, i]));

    let w = 0;
    let h = 0;
    let dpr = 1;
    let geo = null;
    let grow = reduced ? 1 : 0;
    let started = reduced;
    let visible = false;
    const pointer = { x: -9999, y: -9999 };
    let hovered = null;

    const resize = () => {
      const rect = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      // weeks go right and a little up, days go down and a little right; the whole floor sits at the bottom
      const unit = w / (weeks + 7 * 0.62 + 1);
      const cy = unit * 0.3;
      const ry = unit * 0.52;
      const oy = h - 10 - 7 * ry;
      geo = { cx: unit, cy, rx: unit * 0.62, ry, size: unit * 0.82, ox: unit * 0.5, oy, tall: Math.max(20, Math.min(h * 0.55, oy - weeks * cy - 12)) };
    };

    const base = (col, row) => [geo.ox + col * geo.cx + row * geo.rx, geo.oy - col * geo.cy + row * geo.ry];

    const block = (d, height, top, left, front) => {
      const [x, y] = base(d.col, d.row);
      const s = geo.size;
      // the four corners of the footprint, then the same raised
      const p0 = [x, y];
      const p1 = [x + s, y - s * (geo.cy / geo.cx)];
      const p2 = [p1[0] + s * (geo.rx / geo.cx), p1[1] + s * (geo.ry / geo.cx)];
      const p3 = [x + s * (geo.rx / geo.cx), y + s * (geo.ry / geo.cx)];
      const up = (p) => [p[0], p[1] - height];
      const poly = (pts, fill) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };
      if (height > 0.5) {
        poly([p0, p3, up(p3), up(p0)], left); // the face toward the old weeks
        poly([p3, p2, up(p2), up(p3)], front); // the face toward the viewer
      }
      poly([up(p0), up(p1), up(p2), up(p3)], top);
      const t = up(p0);
      return [(t[0] + up(p2)[0]) / 2, (t[1] + up(p2)[1]) / 2];
    };

    let time = 0;
    const draw = (dt) => {
      time += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let best = 14;
      let next = null;
      order.forEach((d) => {
        const i = indexOf.get(d);
        // each week starts rising a moment after the one before it
        const t = Math.min(1, Math.max(0, grow * 2.2 - (d.col / weeks) * 1.2));
        const e = 1 - (1 - t) ** 3;
        const [bx, by] = base(d.col + 0.5, d.row + 0.5);
        const near = Math.hypot(bx - pointer.x, by - pointer.y);
        const target = reduced ? 0 : Math.max(0, 1 - near / 90) * 18;
        lift[i] += (target - lift[i]) * Math.min(1, dt * 8);
        const height = d.count === 0 ? 1.5 + lift[i] * 0.3 : (3 + (d.count / max) * geo.tall) * e + lift[i];
        const isHover = hovered === d;
        const k = d.count === 0 ? 0 : 0.45 + (d.count / max) * 0.55;
        const top = isHover ? bone : d.count === 0 ? empty : shade(signal, 0.5 + k * 0.5);
        const left = d.count === 0 ? empty : shade(signal, 0.28 + k * 0.2);
        const front = d.count === 0 ? empty : shade(signal, 0.4 + k * 0.25);
        const centre = block(d, height, top, left, front);
        const dist = Math.hypot(centre[0] - pointer.x, centre[1] - pointer.y);
        if (dist < best) {
          best = dist;
          next = d;
        }
      });
      hovered = next;
      // today, the last block, glows
      const last = cells[cells.length - 1];
      const [lx, ly] = base(last.col + 0.5, last.row + 0.5);
      ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.2;
      ctx.fillStyle = shade(signal, 1);
      ctx.beginPath();
      ctx.arc(lx, ly, geo.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (hovered) {
        const text = `${formatDate(hovered.date, lang)} · ${hovered.count}`;
        ctx.font = `500 12px ${mono}`;
        const tw = ctx.measureText(text).width + 18;
        const x = Math.min(w - tw - 4, Math.max(4, pointer.x - tw / 2));
        const y = Math.max(4, pointer.y - 44);
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(x, y, tw, 24);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = shade(signal, 1);
        ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, 23);
        ctx.fillStyle = bone;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 9, y + 12);
      }
    };

    const tick = (_, deltaMs) => visible && draw(Math.min(0.05, deltaMs / 1000));

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    let rise = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !started) {
          started = true;
          const box = { v: 0 };
          rise = gsap.to(box, { v: 1, duration: 2.6, ease: 'power2.out', onUpdate: () => (grow = box.v) });
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      rise?.kill();
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [cells, weeks, theme, lang]);

  return <canvas ref={canvas} className="block h-[min(340px,30vw)] w-full" aria-hidden="true" />;
}
