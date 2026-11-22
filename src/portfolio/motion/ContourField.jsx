import { useEffect, useRef } from 'react';
import { useTheme } from '../../shared/lib/theme';
import { prefersReducedMotion } from './gsap';

// The page's background lines: thin contour lines across the whole screen, like a survey map, each swelling slowly with its
// own breath. Under the pointer the ground rises into a soft hill that follows it a little behind, and the lines lift over
// it; the whole sheet leans a few degrees with the pointer, nearer lines (lower on the screen) moving more than far ones.
// Drawn on a 2D canvas, paused when the tab is hidden, still for anyone who asks for less motion.

const LINES = 30;
const STEP = 14; // pixels between the points of a line
const COLORS = { dark: { line: '236,230,218', hot: '255,120,80' }, light: { line: '40,36,30', hot: '201,72,20' } };

export default function ContourField() {
  const { theme } = useTheme();
  const canvas = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!ctx) return undefined;
    const color = COLORS[theme] ?? COLORS.dark;
    const still = prefersReducedMotion();
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    };
    resize();

    const aim = { x: 0.5, y: 0.5, on: 0 }; // the pointer, 0..1, and whether it is over the page
    const hill = { x: 0.5, y: 0.5, lift: 0 }; // the hill under it, eased
    let raf = 0;
    let prev = performance.now();

    const draw = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const k = 1 - Math.exp(-dt * 2.4);
      hill.x += (aim.x - hill.x) * k;
      hill.y += (aim.y - hill.y) * k;
      hill.lift += (aim.on - hill.lift) * (1 - Math.exp(-dt * 1.6));
      const t = still ? 0 : now / 1000;
      // how far the sheet leans: the pointer to one side pulls the near lines that way
      const leanX = (hill.x - 0.5) * 40 * hill.lift;
      const leanY = (hill.y - 0.5) * 18 * hill.lift;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      const hx = hill.x * w;
      const hy = hill.y * h;
      const reach = Math.max(w, h) * 0.22;

      for (let i = 0; i < LINES; i += 1) {
        const v = (i + 0.5) / LINES; // 0 at the top (far), 1 at the bottom (near)
        const depth = 0.35 + v * 0.65;
        const base = h * (0.04 + v * 0.96);
        let near = 0; // how much of this line passes over the hill, for its colour
        ctx.beginPath();
        for (let x = -STEP; x <= w + STEP; x += STEP) {
          const u = x / w;
          // the line's own slow swell
          const swell = Math.sin(u * 5.2 + i * 0.7 + t * 0.25) * 6 + Math.sin(u * 11.3 - i * 0.4 - t * 0.17) * 3;
          // the hill: a soft bump under the pointer, the lines lifting over it (more for nearer lines)
          const dx = x - hx;
          const dy = base - hy;
          const bump = Math.exp(-(dx * dx + dy * dy) / (2 * reach * reach)) * hill.lift;
          near = Math.max(near, bump);
          const y = base + swell * depth - bump * 46 * depth + leanY * depth;
          const px = x + leanX * depth;
          if (x === -STEP) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        const alpha = (0.022 + depth * 0.032 + near * 0.11).toFixed(3);
        ctx.strokeStyle = near > 0.5 ? `rgba(${color.hot},${alpha})` : `rgba(${color.line},${alpha})`;
        ctx.stroke();
      }
      if (!still) raf = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      aim.x = e.clientX / w;
      aim.y = e.clientY / h;
      aim.on = 1;
    };
    const onLeave = () => {
      aim.on = 0;
    };
    const onVisible = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) {
        prev = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    const onResize = () => {
      resize();
      if (still) draw(performance.now());
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', onResize);
    };
  }, [theme]);

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0 -z-[9]" aria-hidden="true" />;
}
