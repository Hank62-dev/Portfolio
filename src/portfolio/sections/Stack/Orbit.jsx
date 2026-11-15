import { useEffect, useMemo, useRef } from 'react';
import { LAYERS } from '../../data/projects';
import { useTheme } from '../../../shared/lib/theme';
import { burst } from '../../motion/burst';
import { gsap, prefersReducedMotion } from '../../motion/gsap';
import { sound } from '../../motion/sound';
import { buildBodies, placeBody, project, ringHeight, ringRadius, viewAt } from './geometry';
import { stackStore } from './stackStore';

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const readColors = () => ({
  signal: token('--color-signal') || '#ff5b2e',
  bone: token('--color-bone') || '#ece6da',
  dim: token('--color-bone-dim') || '#a8a396',
  faint: token('--color-bone-faint') || '#8f8b7f',
  line: token('--color-line-strong') || 'rgba(236,230,218,0.22)',
  ink: token('--color-ink-0') || '#0b0c0e',
  mono: token('--font-mono') || 'monospace',
});

const rand = (seed) => {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The Stack section's picture, drawn on a canvas. Every technology on this site orbits a core on the ring
 * of its layer; scrolling through the section lowers the eye until the four orbits become the four plates
 * of the stack. The layer being read is lit, a chosen project wires its technologies to the core, the
 * bodies shy away from the pointer, and a click knocks them about. Purely decorative: the lists beside it
 * carry the same information as text.
 */
export default function Orbit({ stack, labels, selected }) {
  const canvas = useRef(null);
  const { theme } = useTheme();
  const bodies = useMemo(() => buildBodies(stack), [stack]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el.getContext('2d');
    if (!ctx) return undefined;
    const reduced = prefersReducedMotion();
    const colors = readColors();
    let w = 0;
    let h = 0;
    let dpr = 1;
    let unit = 1;
    let visible = false;
    let time = 0;
    let assemble = reduced ? 1 : 0;
    let assembling = null;
    const pointer = { x: -9999, y: -9999, inside: false };
    let hovered = null;
    // per body: a screen-space push away from the pointer, and a kick velocity from clicks
    const state = bodies.map((b, i) => ({
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      lit: 0,
      // where it flies in from: somewhere far out round the picture
      sx: Math.cos(rand(i + 1) * Math.PI * 2) * (1.6 + rand(i + 7)),
      sy: Math.sin(rand(i + 1) * Math.PI * 2) * (1.6 + rand(i + 7)),
    }));
    const smooth = { progress: stackStore.progress, yaw: 0, tilt: 0, active: stackStore.active, glow: [1, 0, 0, 0] };

    const resize = () => {
      const rect = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      unit = Math.min(w * 0.37, h * 0.43);
    };

    const ringPath = (ring, view, yaw, cx, cy) => {
      const r = ringRadius(ring, view.spread);
      const y = ringHeight(ring, view.spread);
      ctx.beginPath();
      for (let k = 0; k <= 72; k += 1) {
        const a = (k / 72) * Math.PI * 2;
        const p = project(Math.cos(a) * r, y, Math.sin(a) * r, view, yaw);
        const x = cx + p.x * unit;
        const yy = cy + p.y * unit;
        if (k === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.closePath();
    };

    const draw = (dt) => {
      if (!reduced) time += dt;
      smooth.progress += (stackStore.progress - smooth.progress) * Math.min(1, dt * 5);
      const targetYaw = reduced ? 0 : (pointer.inside ? (pointer.x / w - 0.5) * 0.5 : 0) + Math.sin(time * 0.15) * 0.08;
      smooth.yaw += (targetYaw - smooth.yaw) * Math.min(1, dt * 3);
      const targetTilt = pointer.inside && !reduced ? (pointer.y / h - 0.5) * -0.22 : 0;
      smooth.tilt += (targetTilt - smooth.tilt) * Math.min(1, dt * 3);
      const active = stackStore.active;
      smooth.glow = smooth.glow.map((g, i) => g + ((i === active ? 1 : 0) - g) * Math.min(1, dt * 6));

      const base = viewAt(smooth.progress);
      const view = { elevation: Math.min(Math.PI / 2 - 0.02, Math.max(0.12, base.elevation + smooth.tilt)), spread: base.spread };
      const cx = w / 2;
      const cy = h / 2;
      const sel = selectedRef.current;
      const lab = labelsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // the core: a warm glow at the centre, which stretches into a spine through the plates
      const top = project(0, ringHeight(0, view.spread) + 0.12 * view.spread, 0, view, smooth.yaw);
      const bottom = project(0, ringHeight(3, view.spread) - 0.12 * view.spread, 0, view, smooth.yaw);
      const pulse = 1 + Math.sin(time * 2.2) * 0.08;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.36 * pulse);
      g.addColorStop(0, colors.signal);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.22 * (1 - view.spread * 0.55);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      // plates, from the bottom one up so the higher ones lie over the lower
      for (let ring = LAYERS.length - 1; ring >= 0; ring -= 1) {
        const lit = smooth.glow[ring];
        ringPath(ring, view, smooth.yaw, cx, cy);
        ctx.fillStyle = colors.signal;
        ctx.globalAlpha = (0.025 + lit * 0.12) * (0.25 + view.spread * 0.75);
        ctx.fill();
        ctx.globalAlpha = 0.35 + lit * 0.65;
        ctx.strokeStyle = lit > 0.5 ? colors.signal : colors.line;
        ctx.lineWidth = 1 + lit * 0.6;
        ctx.setLineDash(view.spread < 0.5 ? [2, 6] : []);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // the layer's name: on a diagonal seen from above (so the four do not collide), at the right edge of its plate from the side
        const r = ringRadius(ring, view.spread);
        const a = -Math.PI / 4 * (1 - view.spread);
        const edge = project(Math.cos(a) * r, ringHeight(ring, view.spread), Math.sin(a) * r, view, 0);
        ctx.font = `500 11px ${colors.mono}`;
        ctx.fillStyle = lit > 0.5 ? colors.signal : colors.faint;
        ctx.globalAlpha = 0.55 + lit * 0.45;
        const name = `${String(ring + 1).padStart(2, '0')} ${(lab?.[LAYERS[ring]] ?? '').toUpperCase()}`;
        // kept inside the canvas on narrow screens
        const nx = Math.min(cx + edge.x * unit + 14, w - ctx.measureText(name).width - 4);
        ctx.fillText(name, nx, cy + edge.y * unit + 4);
        ctx.globalAlpha = 1;
      }

      // the spine
      ctx.strokeStyle = colors.signal;
      ctx.globalAlpha = 0.25 + view.spread * 0.65;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + top.x * unit, cy + top.y * unit);
      ctx.lineTo(cx + bottom.x * unit, cy + bottom.y * unit);
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let ring = 0; ring < LAYERS.length; ring += 1) {
        const c = project(0, ringHeight(ring, view.spread), 0, view, smooth.yaw);
        ctx.fillStyle = colors.signal;
        ctx.beginPath();
        ctx.arc(cx + c.x * unit, cy + c.y * unit, 2.5 + smooth.glow[ring] * 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // the bodies, placed, pushed, then drawn far to near
      const placed = bodies.map((body, i) => {
        const s = state[i];
        const p = placeBody(body, view, time, smooth.yaw);
        // fly in: each body has its own moment, so they arrive as a swirl rather than all at once
        const t = Math.min(1, Math.max(0, assemble * 1.7 - (i / bodies.length) * 0.7));
        const e = 1 - (1 - t) ** 3;
        let x = cx + (p.x * e + s.sx * (1 - e)) * unit;
        let y = cy + (p.y * e + s.sy * (1 - e)) * unit;
        // push away from the pointer, spring back
        if (pointer.inside && !reduced) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 90) {
            const f = ((90 - d) / 90) ** 2 * 900;
            s.vx += (dx / d) * f * dt;
            s.vy += (dy / d) * f * dt;
          }
        }
        s.vx += -s.ox * 28 * dt;
        s.vy += -s.oy * 28 * dt;
        s.vx *= Math.exp(-dt * 6);
        s.vy *= Math.exp(-dt * 6);
        s.ox += s.vx * dt;
        s.oy += s.vy * dt;
        x += s.ox;
        y += s.oy;
        const focus = stackStore.focus;
        const on = focus ? body.tech === focus : sel ? body.slugs.includes(sel) : body.ring === active;
        s.lit += ((on ? 1 : 0) - s.lit) * Math.min(1, dt * 7);
        return { body, s, x, y, depth: p.depth, scale: p.scale, e, i, ringCentre: project(0, ringHeight(body.ring, view.spread), 0, view, smooth.yaw) };
      });

      // a chosen project: wire each of its technologies to the core of its plate
      if (sel || stackStore.focus) {
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 1;
        placed.forEach((q) => {
          if (q.s.lit < 0.05) return;
          ctx.globalAlpha = q.s.lit * 0.55 * q.e;
          ctx.beginPath();
          ctx.moveTo(cx + q.ringCentre.x * unit, cy + q.ringCentre.y * unit);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      placed.sort((a, b) => a.depth - b.depth);
      hovered = null;
      let best = 22;
      placed.forEach((q) => {
        const d = Math.hypot(q.x - pointer.x, q.y - pointer.y);
        if (pointer.inside && d < best) {
          best = d;
          hovered = q;
        }
      });

      ctx.font = `11px ${colors.mono}`;
      ctx.textBaseline = 'middle';
      placed.forEach((q) => {
        const { body, s } = q;
        const near = 0.55 + Math.max(-0.35, Math.min(0.45, q.depth * 0.6));
        const r = (2.2 + Math.sqrt(body.count) * 1.9) * q.scale * (1 + s.lit * 0.45) * (hovered === q ? 1.5 : 1);
        const dimmed = (sel || stackStore.focus) && s.lit < 0.5;
        // a halo on the lit ones
        if (s.lit > 0.02) {
          ctx.globalAlpha = s.lit * 0.25;
          ctx.fillStyle = colors.signal;
          ctx.beginPath();
          ctx.arc(q.x, q.y, r * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = (dimmed ? 0.25 : near) * q.e;
        ctx.fillStyle = s.lit > 0.5 ? colors.signal : colors.bone;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx.fill();
        // names: the lit ones, the hovered one, and the much-used ones while seen from above
        const label =
          hovered === q ||
          (s.lit > 0.4 && (sel || stackStore.focus || body.count >= 2 || view.spread > 0.6)) ||
          (body.count >= 4 && view.spread < 0.4 && !sel);
        if (label) {
          ctx.globalAlpha = (hovered === q ? 1 : Math.max(s.lit, 0.55) * near) * q.e;
          ctx.fillStyle = hovered === q || s.lit > 0.5 ? colors.bone : colors.dim;
          const right = q.x >= cx;
          ctx.textAlign = right ? 'left' : 'right';
          ctx.fillText(body.tech, q.x + (right ? r + 6 : -r - 6), q.y);
        }
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';

      // the hovered body's card
      if (hovered) {
        const text = `${hovered.body.tech} · ×${hovered.body.count}`;
        ctx.font = `500 12px ${colors.mono}`;
        const tw = ctx.measureText(text).width + 18;
        const bx = Math.min(w - tw - 4, Math.max(4, hovered.x - tw / 2));
        const by = hovered.y - 40;
        ctx.fillStyle = colors.ink;
        ctx.strokeStyle = colors.signal;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.roundRect?.(bx, by, tw, 24, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.fillStyle = colors.bone;
        ctx.fillText(text, bx + 9, by + 12);
      }
      el.style.cursor = hovered ? 'pointer' : '';
    };

    const tick = (_, deltaMs) => {
      if (!visible) return;
      draw(Math.min(0.05, deltaMs / 1000));
    };

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };
    // a click knocks every body away from the point, harder the closer it is
    const onDown = (e) => {
      if (reduced) return;
      onMove(e);
      state.forEach((s, i) => {
        const body = bodies[i];
        const view = viewAt(smooth.progress);
        const p = placeBody(body, view, time, smooth.yaw);
        const dx = w / 2 + p.x * unit + s.ox - pointer.x;
        const dy = h / 2 + p.y * unit + s.oy - pointer.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = Math.max(0, 1 - d / (unit * 1.4)) * 1400;
        s.vx += (dx / d) * f;
        s.vy += (dy / d) * f;
      });
      if (hovered) {
        const rect = el.getBoundingClientRect();
        burst(rect.left + hovered.x, rect.top + hovered.y, 16);
      }
      sound.click();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !assembling && assemble < 1) {
          const box = { v: 0 };
          assembling = gsap.to(box, { v: 1, duration: 2.4, ease: 'power2.out', onUpdate: () => (assemble = box.v) });
        }
      },
      { rootMargin: '80px' }
    );
    io.observe(el);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    // with reduced motion the clock stands still, but the picture still follows the scroll and the choice
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      assembling?.kill();
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
    };
    // theme: the colours are read again by starting over
  }, [bodies, theme]);

  return <canvas ref={canvas} className="block size-full touch-pan-y" aria-hidden="true" />;
}
