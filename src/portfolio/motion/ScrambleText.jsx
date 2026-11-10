import { useEffect, useRef } from 'react';
import { gsap, MOTION, ScrollTrigger } from './gsap';
import { scrambleFrame } from './text';

/**
 * Text that resolves out of random glyphs, once when it enters the viewport and again on hover.
 * The real string is in the DOM for screen readers; only the flickering copy is aria-hidden.
 */
export default function ScrambleText({ text, as: Tag = 'span', hover = false, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      const state = { n: 0 };
      let tween;
      const play = () => {
        tween?.kill();
        state.n = 0;
        tween = gsap.to(state, {
          n: text.length,
          duration: Math.min(1.4, 0.35 + text.length * 0.03),
          ease: 'none',
          onUpdate: () => {
            el.textContent = scrambleFrame(text, Math.floor(state.n));
          },
          onComplete: () => {
            el.textContent = text;
          },
        });
      };
      el.textContent = scrambleFrame(text, 0);
      const trigger = ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: play });
      if (hover) el.addEventListener('pointerenter', play);
      return () => {
        tween?.kill();
        trigger.kill();
        el.removeEventListener('pointerenter', play);
        el.textContent = text;
      };
    });
    return () => mm.revert();
  }, [text, hover]);

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
    </Tag>
  );
}
