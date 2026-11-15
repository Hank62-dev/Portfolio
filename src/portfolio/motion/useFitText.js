import { useLayoutEffect } from 'react';

/**
 * Sizes a one-line piece of type so it spans its parent exactly: measured at a known size, then scaled.
 * Measured again when the parent resizes and when the web fonts arrive (they change the width).
 */
export const useFitText = (ref, { max = 400 } = {}) => {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return undefined;
    const parent = el.parentElement;
    const fit = () => {
      const style = getComputedStyle(parent);
      const room = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (room <= 0) return;
      el.style.fontSize = '100px';
      const natural = el.scrollWidth;
      if (!natural) return;
      // a hair under, so rounding never pushes the last letter off
      el.style.fontSize = `${Math.min(max, (100 * room * 0.995) / natural)}px`;
    };
    fit();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
    ro?.observe(parent);
    document.fonts?.ready.then(fit);
    return () => ro?.disconnect();
  }, [ref, max]);
};
