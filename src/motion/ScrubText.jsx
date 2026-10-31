import { gsap, MOTION, SplitText } from './gsap';
import { useGsap } from './useGsap';

/**
 * A passage that lights up word by word as you scroll through it: words start dim and turn to full
 * strength in reading order, tied to the scroll position (scrub), so reading speed sets the pace.
 * The text is complete and readable in the DOM; reduced motion simply shows it at full strength.
 */
export default function ScrubText({ as: Tag = 'p', children, className, ...rest }) {
  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      const el = ref.current;
      const split = SplitText.create(el, { type: 'words', aria: 'auto' });
      gsap.fromTo(
        split.words,
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.4 },
        }
      );
      return () => split.revert();
    });
  }, []);

  return (
    <Tag ref={scope} className={className} {...rest}>
      {children}
    </Tag>
  );
}
