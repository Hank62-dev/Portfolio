import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from './gsap';

const SEEN_KEY = 'intro-seen';

const alreadySeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

/** Whether the opening sequence should play: once per tab session, never with reduced motion. */
export const shouldPlayIntro = () => !prefersReducedMotion() && !alreadySeen();

const finish = () => {
  document.documentElement.classList.add('intro-done');
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
};

/**
 * A short opening: the name, a counter, then the curtain lifts. The page entrance animations are held
 * (paused in CSS) until `intro-done` lands on <html>, so they play as the curtain clears.
 */
export default function Intro({ name }) {
  const root = useRef(null);
  const counter = useRef(null);
  const bar = useRef(null);

  useLayoutEffect(() => {
    if (!shouldPlayIntro()) {
      finish();
      return undefined;
    }
    const el = root.current;
    el.style.display = 'grid';
    const state = { n: 0 };
    const letters = el.querySelectorAll('[data-intro-name] > span');
    const tl = gsap.timeline({ onComplete: () => (el.style.display = 'none') });
    tl.from(letters, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.06 })
      .to(
        state,
        {
          n: 100,
          duration: 1.1,
          ease: 'power2.inOut',
          onUpdate: () => (counter.current.textContent = String(Math.round(state.n)).padStart(3, '0')),
        },
        0.1
      )
      .to(bar.current, { scaleX: 1, duration: 1.1, ease: 'power2.inOut' }, 0.1)
      .to(letters, { yPercent: -110, duration: 0.6, ease: 'expo.in', stagger: 0.03 }, 1.35)
      .add(finish, 1.75)
      .to(el, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, 1.75);
    return () => {
      tl.kill();
      el.style.display = 'none';
      finish();
    };
  }, []);

  return (
    <div ref={root} className="fixed inset-0 z-[100] place-items-center bg-ink-0" style={{ display: 'none' }} aria-hidden="true">
      <div className="w-[min(520px,80vw)]">
        <p data-intro-name className="flex overflow-hidden font-display text-[clamp(2.4rem,8vw,5rem)] leading-none">
          {[...name].map((char, i) => (
            <span key={i} className="inline-block whitespace-pre">
              {char}
            </span>
          ))}
        </p>
        <div className="mt-8 flex items-center gap-4 font-mono text-fine text-bone-dim">
          <span ref={counter}>000</span>
          <i ref={bar} className="h-px flex-1 origin-left scale-x-0 bg-signal" />
        </div>
      </div>
    </div>
  );
}
