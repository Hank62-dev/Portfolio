import { useEffect, useRef, useState } from 'react';
import { can3D, readEnvironment } from '../lib/capabilities';
import { useTheme } from '../../shared/lib/theme';
import { FINE_POINTER } from './gsap';
import { createFluid } from '../../shared/fx/fluid';

// A small real-time fluid (the stable-fluids method: advect, add swirl back, make it incompressible) that the
// pointer stirs. It carries ink in the accent colour that spreads and curls behind the pointer and fades.
// Velocity runs at a coarse grid, the ink at a finer one; nothing runs when nothing has moved for a while.

const INK = { dark: [1, 0.36, 0.18], light: [0.79, 0.23, 0.04] };

function Ink({ theme }) {
  const host = useRef(null);

  useEffect(() => {
    // a canvas of its own each time: a context that was let go cannot be had again from the same element
    const el = document.createElement('canvas');
    el.className = 'size-full';
    host.current.appendChild(el);
    el.width = Math.round(window.innerWidth * 0.5);
    el.height = Math.round(window.innerHeight * 0.5);
    const fluid = createFluid(el, INK[theme] ?? INK.dark);
    if (!fluid) {
      el.remove();
      return undefined;
    }
    let raf = 0;
    let running = false;
    let idle = 0;
    let last = null;
    let prev = performance.now();
    const strength = theme === 'light' ? 0.9 : 1.1;

    const frame = (now) => {
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      idle += dt;
      if (!document.hidden) {
        fluid.step(dt);
        fluid.display(strength);
      }
      // after a few quiet seconds the ink has faded: stop until the pointer moves again
      if (idle < 5) raf = requestAnimationFrame(frame);
      else running = false;
    };
    const onMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = 1 - e.clientY / window.innerHeight;
      if (last) {
        const dx = (x - last.x) * 6000;
        const dy = (y - last.y) * 6000;
        const speed = Math.hypot(dx, dy);
        if (speed > 1) fluid.splat(x, y, dx, dy, Math.min(0.6, speed / 3000));
      }
      last = { x, y };
      idle = 0;
      if (!running) {
        running = true;
        prev = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const onLeave = () => {
      last = null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      fluid.dispose();
      el.remove();
    };
  }, [theme]);

  return <div ref={host} className="pointer-events-none fixed inset-0 -z-[9]" aria-hidden="true" />;
}

/** Ink the pointer stirs into the page's background. Only with a mouse, where the 3D would also run. */
export default function FluidInk() {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(can3D(readEnvironment()) && window.matchMedia(FINE_POINTER).matches), []);
  return enabled ? <Ink key={theme} theme={theme} /> : null;
}
