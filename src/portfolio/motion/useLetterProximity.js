import { useEffect } from 'react';
import { gsap, FINE_POINTER, MOTION } from './gsap';

/**
 * Letters (elements marked data-letter inside `ref`) lift and turn to the accent colour as the pointer
 * passes near them, strongest directly beneath. Pointer-only and decorative: the text is just text.
 */
export const useLetterProximity = (ref, { radius = 220, lift = 28 } = {}) => {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(`${MOTION} and ${FINE_POINTER}`, () => {
      const root = ref.current;
      if (!root) return undefined;
      const letters = () => root.querySelectorAll('[data-letter]');
      let rest = '';
      let hot = '';
      const readColors = () => {
        const css = getComputedStyle(document.documentElement);
        rest = css.getPropertyValue('--color-bone').trim();
        hot = css.getPropertyValue('--color-signal').trim();
      };
      const onMove = (e) => {
        letters().forEach((el) => {
          const r = el.getBoundingClientRect();
          const near = Math.max(0, 1 - Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) / radius);
          gsap.to(el, { y: -near * lift, color: near > 0.55 ? hot : rest, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        });
      };
      const reset = () => gsap.to(letters(), { y: 0, color: rest, duration: 0.8, ease: 'power3.out' });
      root.addEventListener('pointerenter', readColors);
      root.addEventListener('pointermove', onMove);
      root.addEventListener('pointerleave', reset);
      return () => {
        root.removeEventListener('pointerenter', readColors);
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerleave', reset);
        gsap.set(letters(), { clearProps: 'y,color' });
      };
    });
    return () => mm.revert();
  }, [ref, radius, lift]);
};
