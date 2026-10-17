import { useEffect, useRef } from 'react';

// Pointer-driven effects only make sense with a real mouse and when motion is welcome.
const FINE_POINTER = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

export const canUsePointerFx = () => typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches;

/** Writes the pointer position (relative to the element) into --mx / --my on every frame it moves. */
export const usePointerGlow = () => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canUsePointerFx()) return undefined;
    let raf = 0;

    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };

    el.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
    };
  }, []);

  return ref;
};

/** Tilts the element towards the pointer, up to `max` degrees. */
export const useTilt = (max = 4) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canUsePointerFx()) return undefined;
    let raf = 0;

    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max]);

  return ref;
};

/** Pulls the element a fraction of the way towards the pointer while it hovers. */
export const useMagnetic = (enabled = true, strength = 0.28, limit = 10) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || !canUsePointerFx()) return undefined;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      const clamp = (v) => Math.max(-limit, Math.min(limit, v));
      el.style.transform = `translate(${clamp(dx).toFixed(1)}px, ${clamp(dy).toFixed(1)}px)`;
    };
    const onLeave = () => {
      el.style.transform = '';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled, strength, limit]);

  return ref;
};
