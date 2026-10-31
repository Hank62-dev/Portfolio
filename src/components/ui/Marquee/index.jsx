import { useEffect, useMemo, useRef } from 'react';
import { deriveStack, LAYERS } from '../../../data/projects';

const MAX_BOOST = 6;

/**
 * Speeds the ticker up while the page is being scrolled and eases it back to its resting pace.
 * Uses the running CSS animation's playbackRate, so it costs nothing per frame while idle.
 */
const useScrollBoost = (trackRef) => {
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return undefined;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let boost = 0;
    let raf = 0;

    const setRate = (rate) => {
      const animation = track.getAnimations()[0];
      if (animation) animation.playbackRate = rate;
    };
    const tick = () => {
      boost *= 0.92;
      if (boost < 0.02) {
        boost = 0;
        raf = 0;
        setRate(1);
        return;
      }
      setRate(1 + boost);
      raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const now = performance.now();
      const speed = Math.abs(window.scrollY - lastY) / Math.max(now - lastT, 1); // px per ms
      lastY = window.scrollY;
      lastT = now;
      boost = Math.min(MAX_BOOST, Math.max(boost, speed * 2.2));
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      setRate(1);
    };
  }, [trackRef]);
};

/**
 * A slow ticker of technologies, ordered by how many projects use them.
 * Decorative (the real, accessible version is the Stack section), hence aria-hidden.
 */
const Marquee = () => {
  const trackRef = useRef(null);
  useScrollBoost(trackRef);

  const items = useMemo(() => {
    const stack = deriveStack();
    const all = LAYERS.flatMap((l) => stack[l]);
    const seen = new Set();
    return all
      .sort((a, b) => b.slugs.length - a.slugs.length)
      .filter(({ tech }) => !seen.has(tech) && seen.add(tech))
      .slice(0, 16)
      .map(({ tech }) => tech);
  }, []);

  return (
    <div
      className="group overflow-hidden border-y border-line bg-ink-1 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      aria-hidden="true"
    >
      <div ref={trackRef} className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex flex-none">
            {items.map((tech) => (
              <li
                key={tech}
                className="py-[18px] pl-7 font-mono text-fine tracking-[0.1em] whitespace-nowrap text-bone-dim uppercase"
              >
                {tech}
                <span className="ml-7 text-signal">/</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
