import { useEffect, useRef } from 'react';
import { createFluid } from '../../../shared/fx/fluid';
import { canGL } from '../../../shared/fx/gate';
import { toRgb } from '../../../shared/fx/shader';

/**
 * The voice as ink, behind the recorder while it listens: a real fluid (shared/fx/fluid) that the sound stirs. Each moment
 * the voice is loud enough, ink is pushed out from round the record button, in a direction that turns slowly, as strong as
 * the voice; it curls, spreads and fades. `level()` says how loud it is now (0..1). Nothing is drawn where a GPU effect
 * cannot run; the waveform below says the same thing in bars.
 */
export default function VoiceInk({ level }) {
  const host = useRef(null);
  const read = useRef(level);
  read.current = level;

  useEffect(() => {
    const box = host.current;
    if (!box || !canGL()) return undefined;
    const el = document.createElement('canvas');
    el.className = 'absolute inset-0 size-full';
    box.appendChild(el);
    const r = box.getBoundingClientRect();
    el.width = Math.max(64, Math.round(r.width * 0.6));
    el.height = Math.max(64, Math.round(r.height * 0.6));
    const signal = getComputedStyle(document.documentElement).getPropertyValue('--color-signal').trim() || '#ff5b2e';
    const fluid = createFluid(el, toRgb(signal), { sim: 96, dye: 384, curl: 30, fade: 0.7, radius: 2.2, maxAlpha: 0.6 });
    if (!fluid) {
      el.remove();
      return undefined;
    }
    let raf = 0;
    let prev = performance.now();
    let angle = Math.random() * Math.PI * 2;
    const frame = (now) => {
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      const loud = Math.max(0, Math.min(1, read.current?.() ?? 0));
      angle += dt * (0.6 + loud * 2.4);
      if (loud > 0.06) {
        // two jets, opposite each other, from just outside the button (the middle of the upper part of the panel)
        for (const side of [0, Math.PI]) {
          const a = angle + side;
          const x = 0.5 + Math.cos(a) * 0.08;
          const y = 0.68 + Math.sin(a) * 0.12;
          fluid.splat(x, y, Math.cos(a) * 900 * loud, Math.sin(a) * 900 * loud, 0.25 + loud * 0.55);
        }
      }
      if (!document.hidden) {
        fluid.step(dt);
        fluid.display(1.2);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      fluid.dispose();
      el.remove();
    };
  }, []);

  return <div ref={host} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
