import { useEffect, useRef } from 'react';
import { useTheme } from '../../../shared/lib/theme';
import { gsap, FINE_POINTER, MOTION, ScrollTrigger } from '../../motion/gsap';
import { sound } from '../../motion/sound';

const PAD = 80; // px of room round the name for the dust to fly into

/**
 * The footer's name as a cloud of a few thousand grains of dust that hold the shape of the letters. They
 * gather out of a scatter when the footer comes into view, shy away from the pointer (turning the accent
 * colour as they go), lean in depth with it, and burst outwards on a click before settling back into
 * the name. The real text stays underneath (transparent), so it is still selectable and measurable.
 * Mouse-only; everyone else gets the plain type.
 */
export default function ParticleName({ textRef, onActive }) {
  const canvas = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!window.matchMedia(`${MOTION} and ${FINE_POINTER}`).matches) return undefined;
    const el = canvas.current;
    const text = textRef.current;
    const ctx = el?.getContext('2d');
    if (!ctx || !text) return undefined;
    const css = getComputedStyle(document.documentElement);
    const bone = css.getPropertyValue('--color-bone').trim() || '#ece6da';
    const signal = css.getPropertyValue('--color-signal').trim() || '#ff5b2e';

    let w = 0;
    let h = 0;
    let dpr = 1;
    let grains = [];
    let gather = 0; // 0 scattered .. 1 in the name
    const pointer = { x: -9999, y: -9999, tilt: 0, t: 0 };
    let visible = false;
    let started = false;

    // where the letters are: draw the name off screen exactly as the page sets it, keep every few pixels that are ink
    const build = () => {
      const r = text.getBoundingClientRect();
      const s = getComputedStyle(text);
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width + PAD * 2;
      h = r.height + PAD * 2;
      el.style.left = `${text.offsetLeft - PAD}px`;
      el.style.top = `${text.offsetTop - PAD}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      const off = document.createElement('canvas');
      off.width = Math.ceil(r.width);
      off.height = Math.ceil(r.height);
      const o = off.getContext('2d', { willReadFrequently: true });
      o.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      o.letterSpacing = s.letterSpacing;
      o.textBaseline = 'alphabetic';
      o.fillStyle = '#000';
      // the paragraph's padding and line box: the baseline sits where the browser puts it
      const size = parseFloat(s.fontSize);
      const top = parseFloat(s.paddingTop);
      const lineHeight = parseFloat(s.lineHeight) || size;
      const m = o.measureText(text.textContent);
      const baseline = top + (lineHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      o.fillText(text.textContent, parseFloat(s.paddingLeft) || 0, baseline);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const step = Math.max(3, Math.round(size / 42));
      const next = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (data[(y * off.width + x) * 4 + 3] > 128) {
            const old = grains[next.length];
            next.push({
              // a little off the sampling grid, so the letters read as dust rather than a dot-matrix
              hx: x + PAD + (Math.random() - 0.5) * step * 0.9,
              hy: y + PAD + (Math.random() - 0.5) * step * 0.9,
              z: (Math.random() - 0.5) * 60,
              x: old?.x ?? Math.random() * w,
              y: old?.y ?? Math.random() * h,
              vx: 0,
              vy: 0,
              sx: (Math.random() - 0.5) * w * 1.2,
              sy: (Math.random() - 0.5) * h * 2,
              heat: 0,
              size: step * (0.42 + Math.random() * 0.3),
            });
          }
        }
      }
      grains = next;
    };

    const draw = (dt) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      pointer.tilt += (pointer.t - pointer.tilt) * Math.min(1, dt * 4);
      const cx = w / 2;
      const ease = 1 - (1 - gather) ** 3;
      const sin = Math.sin(pointer.tilt * 0.35);
      for (let i = 0; i < grains.length; i += 1) {
        const g = grains[i];
        // the home of the grain: the name, swung a little in depth by the pointer, or the scatter before it gathers
        const tx = cx + (g.hx - cx) + g.z * sin + g.sx * (1 - ease);
        const ty = g.hy + g.sy * (1 - ease);
        let ax = (tx - g.x) * 40;
        let ay = (ty - g.y) * 40;
        const dx = g.x - pointer.x;
        const dy = g.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 120 * 120) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / 120) * 9000;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
          g.heat = Math.min(1, g.heat + dt * 6);
        }
        g.vx = (g.vx + ax * dt) * 0.86;
        g.vy = (g.vy + ay * dt) * 0.86;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.heat = Math.max(0, g.heat - dt * 1.2);
        const speed = Math.min(1, Math.hypot(g.vx, g.vy) / 900);
        const k = Math.max(g.heat, speed);
        ctx.globalAlpha = 0.55 + 0.45 * (1 - Math.abs(g.z) / 60);
        ctx.fillStyle = k > 0.3 ? signal : bone;
        const s = g.size * (1 + k * 0.6);
        ctx.fillRect(g.x - s / 2, g.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    build();
    document.fonts?.ready.then(build);
    const ro = new ResizeObserver(build);
    ro.observe(text);
    onActive(true);

    const tick = (_, ms) => {
      if (!visible) return;
      draw(Math.min(0.033, ms / 1000));
    };
    gsap.ticker.add(tick);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started) {
        started = true;
        const box = { v: 0 };
        gsap.to(box, { v: 1, duration: 2.4, ease: 'power3.out', delay: 0.2, onUpdate: () => (gather = box.v) });
      }
    });
    io.observe(el);

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.t = (pointer.x / w - 0.5) * 2;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
      pointer.t = 0;
    };
    const onDown = (e) => {
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      grains.forEach((g) => {
        const dx = g.x - px;
        const dy = g.y - py;
        const d = Math.hypot(dx, dy) || 1;
        const kick = 2600 * Math.max(0.15, 1 - d / (w * 0.6));
        g.vx += (dx / d) * kick + (Math.random() - 0.5) * 600;
        g.vy += (dy / d) * kick + (Math.random() - 0.5) * 600;
        g.heat = 1;
      });
      sound.click();
    };
    // the footer is pinned under the page, so it listens on the whole name's frame
    const frame = el.parentElement;
    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerleave', onLeave);
    frame.addEventListener('pointerdown', onDown);
    ScrollTrigger.refresh();
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      frame.removeEventListener('pointermove', onMove);
      frame.removeEventListener('pointerleave', onLeave);
      frame.removeEventListener('pointerdown', onDown);
      onActive(false);
    };
  }, [textRef, onActive, theme]);

  return (
    <canvas
      ref={canvas}
      className="pointer-events-none absolute top-0 left-0 max-w-none"
      aria-hidden="true"
    />
  );
}
