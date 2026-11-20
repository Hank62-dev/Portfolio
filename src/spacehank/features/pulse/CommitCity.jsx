import { useEffect, useMemo, useRef, useState } from 'react';
import { heatmapCells, sumCounts } from '../../../shared/lib/contributions';
import { canMove } from '../../../shared/fx/gate';
import { useTheme } from '../../../shared/lib/theme';
import { locale, tr } from '../../core/i18n/lang';

const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const rgbOf = (color) => {
  const probe = document.createElement('canvas').getContext('2d');
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  return [...probe.getImageData(0, 0, 1, 1).data.slice(0, 3)];
};
const shade = ([r, g, b], k) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;

/**
 * The owner's last half year of contributions as a small city seen from above at an angle: a block per day, as tall as the
 * day was busy, the weeks running off to the right. It rises in a wave from the oldest week when it is shown, and the blocks
 * near the pointer lift; the day under the pointer is named below. Only the canvas is drawn from this: the count is in words
 * for everyone.
 */
export default function CommitCity({ days, weeks = 26 }) {
  const canvas = useRef(null);
  const { theme } = useTheme();
  const [hover, setHover] = useState(null);
  const { cells } = useMemo(() => heatmapCells(days, weeks), [days, weeks]);
  const total = useMemo(() => sumCounts(days.slice(-weeks * 7)), [days, weeks]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!ctx || !cells.length) return undefined;
    const signal = rgbOf(css('--color-signal', '#ff5b2e'));
    const empty = rgbOf(css('--color-ink-3', '#1e2127'));
    const max = Math.max(...cells.map((c) => c.count), 1);
    const cols = cells[cells.length - 1].col + 1;
    const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c.col + a.c.row - (b.c.col + b.c.row) || a.c.col - b.c.col);
    const lift = new Float32Array(cells.length);
    const moving = canMove();
    let start = performance.now();
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let tile = 8;
    const pointer = { x: -999, y: -999 };

    const size = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      // the city spans (cols + 7) tiles across and (cols + 6) diagonal steps down, with room above for the tallest blocks
      tile = Math.min(w / ((cols + 8) * 0.95), (h * 0.62) / ((cols + 6) * 0.42), 16);
    };
    // a cell's ground point on screen: columns go right and up, rows right and down; the whole city is centred
    const middle = (6 - (cols - 1)) / 2;
    const ground = (col, row) => ({
      x: w / 2 + (col + row - (cols + 5) / 2) * tile * 0.95,
      y: h * 0.6 + (row - col - middle) * tile * 0.42,
    });

    const draw = (now) => {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = moving ? (now - start) / 1000 : 9;
      let busy = t < 2.4;
      let nearest = null;
      let nearestD = tile * 1.2;
      for (const { c, i } of order) {
        const g = ground(c.col, c.row);
        // the wave: each week rises a moment after the one before it
        const rise = Math.min(1, Math.max(0, (t - c.col * 0.045) / 0.7));
        const eased = 1 - (1 - rise) ** 3;
        const d = Math.hypot(g.x - pointer.x, g.y - pointer.y);
        const want = d < tile * 4 ? (1 - d / (tile * 4)) * tile * 1.6 : 0;
        lift[i] += (want - lift[i]) * 0.2;
        if (Math.abs(want - lift[i]) > 0.1) busy = true;
        if (d < nearestD) {
          nearestD = d;
          nearest = c;
        }
        const height = (c.count ? 3 + (c.count / max) * tile * 5 : 1) * eased + lift[i];
        const base = c.count ? signal : empty;
        const k = c.count ? 0.55 + 0.45 * (c.count / max) : 1;
        const hw = tile * 0.46;
        const hd = tile * 0.2;
        const top = g.y - height;
        // left face, right face, then the lid
        ctx.fillStyle = shade(base, k * 0.62);
        ctx.beginPath();
        ctx.moveTo(g.x - hw, g.y);
        ctx.lineTo(g.x, g.y + hd);
        ctx.lineTo(g.x, top + hd);
        ctx.lineTo(g.x - hw, top);
        ctx.fill();
        ctx.fillStyle = shade(base, k * 0.8);
        ctx.beginPath();
        ctx.moveTo(g.x + hw, g.y);
        ctx.lineTo(g.x, g.y + hd);
        ctx.lineTo(g.x, top + hd);
        ctx.lineTo(g.x + hw, top);
        ctx.fill();
        ctx.fillStyle = shade(base, Math.min(1.25, k * 1.1));
        ctx.beginPath();
        ctx.moveTo(g.x - hw, top);
        ctx.lineTo(g.x, top - hd);
        ctx.lineTo(g.x + hw, top);
        ctx.lineTo(g.x, top + hd);
        ctx.fill();
      }
      setHover(pointer.x > 0 ? nearest : null);
      if (busy) raf = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onMove = (event) => {
      const r = el.getBoundingClientRect();
      pointer.x = event.clientX - r.left;
      pointer.y = event.clientY - r.top;
      wake();
    };
    const onLeave = () => {
      pointer.x = -999;
      pointer.y = -999;
      wake();
    };
    size();
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        start = performance.now();
        wake();
        io.disconnect();
      }
    });
    io.observe(el);
    const ro = new ResizeObserver(() => {
      size();
      wake();
    });
    ro.observe(el);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [cells, theme]);

  if (!cells.length) return null;
  const day = hover ? new Date(`${hover.date}T00:00:00`).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' }) : null;
  return (
    <figure className="relative overflow-hidden rounded-3xl border border-line bg-ink-1 p-5" data-commit-city>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lead text-bone">{tr('{0} contributions in the last six months', total)}</span>
        <span className="font-mono text-[0.72rem] text-bone-faint tabular-nums" aria-hidden="true">
          {hover ? tr('{0}: {1}', day, hover.count) : tr('Point at a day')}
        </span>
      </figcaption>
      <canvas ref={canvas} className="mt-2 block h-44 w-full touch-pan-y sm:h-56" aria-hidden="true" />
    </figure>
  );
}
