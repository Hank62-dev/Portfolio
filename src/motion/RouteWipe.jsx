import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, prefersReducedMotion } from './gsap';

/**
 * A curtain that is already covering the screen when the new route renders, then peels away.
 * Runs on route changes only, not on first load (the intro handles that).
 */
export default function RouteWipe() {
  const { pathname } = useLocation();
  const curtain = useRef(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (prefersReducedMotion()) return undefined;
    const el = curtain.current;
    gsap.set(el, { scaleY: 1, transformOrigin: 'top' });
    const tween = gsap.to(el, { scaleY: 0, transformOrigin: 'bottom', duration: 0.9, ease: 'expo.inOut', delay: 0.05 });
    return () => tween.kill();
  }, [pathname]);

  return <div ref={curtain} className="pointer-events-none fixed inset-0 z-[95] origin-top scale-y-0 bg-signal" aria-hidden="true" />;
}
