import { useEffect, useState } from 'react';
import { canUsePointerFx } from '../../hooks/useMotion';
import { heroStore } from './heroStore';

const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/**
 * Feeds the hero's scroll position and pointer into `heroStore` and into a `--p` CSS variable (0..1)
 * on the section, which drives the text parallax. Returns whether the hero is on screen.
 * With reduced motion nothing moves: the store stays at rest and `--p` stays 0.
 */
export const useHeroMotion = (sectionRef) => {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
      io.observe(section);
    }

    if (!window.matchMedia(MOTION_OK).matches) return () => io?.disconnect();

    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (section.offsetHeight * 0.9)));
      heroStore.scroll = p;
      section.style.setProperty('--p', p.toFixed(3));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onPointer = (e) => {
      const r = section.getBoundingClientRect();
      heroStore.pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      heroStore.pointerY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      heroStore.pointerX = 0;
      heroStore.pointerY = 0;
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (canUsePointerFx()) {
      section.addEventListener('pointermove', onPointer);
      section.addEventListener('pointerleave', onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      section.removeEventListener('pointermove', onPointer);
      section.removeEventListener('pointerleave', onLeave);
      Object.assign(heroStore, { pointerX: 0, pointerY: 0, scroll: 0 });
    };
  }, [sectionRef]);

  return inView;
};
