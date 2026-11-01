import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';
import { motionStore } from './store';

/** The running Lenis instance, or null (reduced motion, or not mounted). Module-level so plain helpers can use it. */
export const lenisRef = { current: null };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Smooth scrolling, wired into GSAP's ticker so ScrollTrigger and Lenis share one clock.
 * Also keeps `motionStore` up to date with the pointer and the scroll speed.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = prefersReducedMotion();
    let lenis = null;
    let tick;

    if (!reduced) {
      // A panel that scrolls on its own (the workspace sidebar, lyrics, the palette, a note list) must get the wheel
      // itself, or only dragging its scrollbar would move it. Anything with room to scroll opts out of smoothing.
      const scrollsOnItsOwn = (node) => {
        for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
          if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
        }
        return false;
      };
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, prevent: scrollsOnItsOwn });
      lenisRef.current = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      tick = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    let lastY = window.scrollY;
    const frame = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      motionStore.velocity += (clamp(y - lastY, -80, 80) - motionStore.velocity) * 0.12;
      motionStore.progress = max > 0 ? clamp(y / max, 0, 1) : 0;
      lastY = y;
    };
    gsap.ticker.add(frame);

    const onPointer = (e) => {
      motionStore.pointerX = e.clientX / window.innerWidth;
      motionStore.pointerY = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Fonts and images change layout: let ScrollTrigger re-measure.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener('pointermove', onPointer);
      gsap.ticker.remove(frame);
      if (lenis) {
        gsap.ticker.remove(tick);
        lenis.destroy();
        lenisRef.current = null;
      }
    };
  }, []);

  return null;
}
