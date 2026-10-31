import { useGsap } from './useGsap';
import { gsap, MOTION, SplitText } from './gsap';

const VARIANTS = {
  // Each line rises out of a mask. The default for headings.
  lines: { type: 'lines', mask: 'lines', target: 'lines', from: { yPercent: 115 }, stagger: 0.12, duration: 1.15 },
  // Words rise one after another; good for short statements.
  words: { type: 'words', mask: 'words', target: 'words', from: { yPercent: 115 }, stagger: 0.045, duration: 0.9 },
  // Letters tumble in: for the biggest type only, since it creates many elements.
  chars: {
    type: 'chars,words',
    target: 'chars',
    from: { yPercent: 90, rotate: 8, opacity: 0, transformOrigin: '0% 100%' },
    stagger: 0.018,
    duration: 0.9,
  },
};

/**
 * Text that animates in when it scrolls into view, split by line, word or letter.
 * It renders the final text, so without JS or with reduced motion it is simply there.
 * SplitText re-splits when the width or the font changes, and screen readers still get the whole string.
 */
export default function SplitReveal({ as: Tag = 'div', variant = 'lines', start = 'top 88%', delay = 0, children, ...rest }) {
  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      const el = ref.current;
      const v = VARIANTS[variant];
      SplitText.create(el, {
        type: v.type,
        mask: v.mask,
        aria: 'auto',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self[v.target], {
            ...v.from,
            duration: v.duration,
            ease: 'expo.out',
            stagger: v.stagger,
            delay,
            scrollTrigger: { trigger: el, start, once: true },
          }),
      });
    });
  }, [variant, start, delay]);

  return (
    <Tag ref={scope} {...rest}>
      {children}
    </Tag>
  );
}
