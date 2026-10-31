import { useLayoutEffect, useRef } from 'react';
import { gsap } from './gsap';

/**
 * Runs `setup({ scope, mm })` once the DOM exists and reverts everything it created on cleanup.
 * `mm` is a gsap.matchMedia(), so put animations inside mm.add(MOTION, ...). Attach the returned
 * ref to the element the setup should query inside of; selector strings resolve within it.
 */
export const useGsap = (setup, deps = []) => {
  const scope = useRef(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => setup({ scope, mm }), scope);
    return () => {
      mm.revert();
      ctx.revert();
    };
    // `setup` is intentionally not a dependency: callers list what should re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return scope;
};
