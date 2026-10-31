import { useMemo, useRef } from 'react';
import { deriveStack, LAYERS } from '../../../data/projects';
import { useLang } from '../../../lib/i18n';
import { clsx } from '../../../lib/format';
import { gsap, MOTION } from '../../../motion/gsap';
import { motionStore } from '../../../motion/store';
import { useGsap } from '../../../motion/useGsap';

/**
 * One row of a kinetic marquee. It loops forever, speeds up while you scroll, and flips direction
 * with the scroll direction; the row also leans (skew) into the movement. With reduced motion it is a
 * static strip. `items` render twice so the loop is seamless.
 */
const Row = ({ items, big = false, reverse = false, className }) => {
  const track = useRef(null);
  const scope = useGsap(({ mm }) => {
    mm.add(MOTION, () => {
      const el = track.current;
      const loop = gsap.fromTo(
        el,
        { xPercent: reverse ? -50 : 0 },
        { xPercent: reverse ? 0 : -50, duration: big ? 38 : 60, ease: 'none', repeat: -1 }
      );
      const skew = gsap.quickSetter(el, 'skewX', 'deg');
      let heading = 1; // flips when you scroll back up, and stays until you scroll down again
      const tick = () => {
        const v = motionStore.velocity;
        if (v > 0.4) heading = 1;
        else if (v < -0.4) heading = -1;
        loop.timeScale(heading * (1 + Math.abs(v) * 0.35));
        skew(gsap.utils.clamp(-12, 12, -v * 0.5));
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    });
  }, [big, reverse]);

  return (
    <div ref={scope} className={clsx('overflow-hidden', className)}>
      <div ref={track} className="flex w-max will-change-transform">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex flex-none" aria-hidden={copy === 1 || undefined}>
            {items.map((item) => (
              <li
                key={item}
                className={clsx(
                  'whitespace-nowrap',
                  big
                    ? 'px-[0.4em] font-display text-[clamp(3.5rem,11vw,10rem)] leading-[1.05] text-transparent [-webkit-text-stroke:1px_var(--color-bone-faint)] transition-[color] duration-300 hover:text-signal hover:[-webkit-text-stroke-color:var(--color-signal)]'
                    : 'py-[18px] pl-7 font-mono text-fine tracking-[0.1em] text-bone-dim uppercase'
                )}
              >
                {item}
                <span className={clsx('text-signal', big ? 'ml-[0.4em] font-body text-[0.5em] align-middle' : 'ml-7')}>
                  {big ? '✦' : '/'}
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
};

/**
 * Two rows between the hero and the first section: the headline in outline type, then the technologies
 * ordered by how many projects use them. Decorative (the accessible versions are the hero and Stack).
 */
const Marquee = () => {
  const { c } = useLang();
  const words = useMemo(() => c.hero.title.join(' ').replace(/[.,]/g, '').split(' '), [c]);
  const tech = useMemo(() => {
    const stack = deriveStack();
    const all = LAYERS.flatMap((l) => stack[l]);
    const seen = new Set();
    return all
      .sort((a, b) => b.slugs.length - a.slugs.length)
      .filter(({ tech: name }) => !seen.has(name) && seen.add(name))
      .slice(0, 16)
      .map(({ tech: name }) => name);
  }, []);

  return (
    <div className="relative overflow-hidden border-y border-line bg-ink-1/60 py-6 backdrop-blur-[2px]" aria-hidden="true">
      <Row items={words} big />
      <Row
        items={tech}
        reverse
        className="mt-4 border-t border-line [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      />
    </div>
  );
};

export default Marquee;
