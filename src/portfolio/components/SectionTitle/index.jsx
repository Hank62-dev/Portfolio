import { Fragment, useRef } from 'react';
import { useGsap } from '../../motion/useGsap';
import { gsap, MOTION } from '../../motion/gsap';
import ScrambleText from '../../motion/ScrambleText';
import SplitReveal from '../../motion/SplitReveal';

/**
 * Section header: a numbered label on a hairline that draws itself, then a serif title whose lines rise
 * out of a mask. `title` is an array of lines; the last line is emphasised.
 */
const SectionTitle = ({ index, label, title, lede, id, stacked = false }) => {
  const rule = useRef(null);
  const ghost = useRef(null);
  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      // the hollow number drifts up past the heading as it scrolls by
      if (ghost.current) {
        gsap.fromTo(
          ghost.current,
          { yPercent: 35 },
          { yPercent: -35, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      }
      gsap.from(rule.current, {
        scaleX: 0,
        transformOrigin: 'left',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: rule.current, start: 'top 92%', once: true },
      });
    });
  }, []);

  return (
    <header
      ref={scope}
      className={
        stacked
          ? 'mb-[clamp(40px,6vw,64px)] grid gap-7'
          : 'relative isolate mb-[clamp(40px,6vw,80px)] grid gap-7 min-[900px]:grid-cols-[5fr_4fr] min-[900px]:items-end min-[900px]:gap-x-16'
      }
    >
      {!stacked && (
        <span
          ref={ghost}
          className="pointer-events-none absolute -top-[0.35em] right-0 -z-10 font-display text-[clamp(7rem,4rem+16vw,20rem)] leading-none text-transparent select-none [-webkit-text-stroke:1px_var(--color-line)]"
          aria-hidden="true"
        >
          {index}
        </span>
      )}
      <div className="relative flex items-center gap-4 pb-3.5 font-mono text-fine tracking-[0.08em] text-bone-dim uppercase min-[900px]:col-span-full">
        <ScrambleText text={index} className="text-signal" />
        <ScrambleText text={label} />
        <i ref={rule} className="absolute inset-x-0 bottom-0 h-px bg-line-strong" aria-hidden="true" />
      </div>

      <SplitReveal
        key={title.join('|')}
        as="h2"
        id={id}
        className="max-w-[18ch] font-display text-h2 min-[900px]:max-w-none"
      >
        {title.map((line, i) => (
          <Fragment key={line}>
            {i > 0 && ' '}
            <span className={i === title.length - 1 ? 'serif-accent' : undefined}>{line}</span>
          </Fragment>
        ))}
      </SplitReveal>

      {lede && (
        <SplitReveal key={lede} as="p" delay={0.25} className="max-w-[58ch] text-lead leading-[1.55] text-bone-dim">
          {lede}
        </SplitReveal>
      )}
    </header>
  );
};

export default SectionTitle;
