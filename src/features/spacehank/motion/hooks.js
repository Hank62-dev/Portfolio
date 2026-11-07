import { useEffect, useRef, useState } from 'react';

// Small helpers for movement that is quiet by design: it happens when you arrive or when you touch something, never on a loop,
// and it stays still for anyone who has asked their device for less motion.

export const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/** Ease-out: fast at first, settling softly. t is 0..1. */
export const easeOutQuart = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 4;

/**
 * A number that counts up to `target` when it first shows, and glides to each new value after that. Where motion is not wanted
 * it is simply the target. Round it where you draw it.
 */
export const useCountUp = (target, { duration = 900 } = {}) => {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced) return undefined;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const next = origin + (target - origin) * easeOutQuart(t);
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return reduced ? target : value;
};

/**
 * True for `ms` after `done` turns from false to true while the screen is on (not when it opens already done): the moment to
 * celebrate something that was just finished.
 */
export const useJustCompleted = (done, ms = 2200) => {
  const [just, setJust] = useState(false);
  const was = useRef(done);
  useEffect(() => {
    let timer = 0;
    if (done && !was.current) {
      setJust(true);
      timer = window.setTimeout(() => setJust(false), ms);
    }
    was.current = done;
    return () => window.clearTimeout(timer);
  }, [done, ms]);
  return just;
};

/** Plays `work` one frame after the screen has drawn what it needs (so a target that has only just appeared can be found). */
export const afterPaint = (work) => requestAnimationFrame(() => requestAnimationFrame(work));
