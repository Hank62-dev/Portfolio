import { useEffect, useRef } from 'react';
import { gsap, FINE_POINTER, MOTION } from './gsap';

// Elements opt in with data-cursor="label"; links and buttons get the plain "grow" state.
const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, summary';

/**
 * A ring that trails the pointer and swells over anything clickable, showing a short label for
 * elements marked data-cursor. Only on devices with a real mouse and when motion is welcome; the
 * system cursor is never hidden, so nothing depends on this.
 */
export default function Cursor() {
  const ring = useRef(null);
  const dot = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(`${MOTION} and ${FINE_POINTER}`, () => {
      const ringEl = ring.current;
      const dotEl = dot.current;
      const labelEl = label.current;
      gsap.set([ringEl, dotEl], { xPercent: -50, yPercent: -50, opacity: 0 });

      const ringX = gsap.quickTo(ringEl, 'x', { duration: 0.55, ease: 'power3' });
      const ringY = gsap.quickTo(ringEl, 'y', { duration: 0.55, ease: 'power3' });
      const dotX = gsap.quickTo(dotEl, 'x', { duration: 0.12, ease: 'power3' });
      const dotY = gsap.quickTo(dotEl, 'y', { duration: 0.12, ease: 'power3' });
      let shown = false;

      const move = (e) => {
        if (!shown) {
          shown = true;
          gsap.set([ringEl, dotEl], { x: e.clientX, y: e.clientY });
          gsap.to([ringEl, dotEl], { opacity: 1, duration: 0.3 });
        }
        ringX(e.clientX);
        ringY(e.clientY);
        dotX(e.clientX);
        dotY(e.clientY);
      };
      const over = (e) => {
        const tagged = e.target.closest?.('[data-cursor]');
        const text = tagged?.dataset.cursor || '';
        const interactive = Boolean(tagged || e.target.closest?.(INTERACTIVE));
        labelEl.textContent = text;
        gsap.to(ringEl, {
          scale: text ? 3.2 : interactive ? 1.8 : 1,
          backgroundColor: text ? 'rgb(255 91 46 / 0.92)' : 'rgb(255 255 255 / 0)',
          borderColor: text ? 'rgb(255 91 46 / 0)' : 'rgb(236 230 218 / 0.7)',
          duration: 0.4,
          ease: 'expo.out',
        });
        gsap.to(labelEl, { opacity: text ? 1 : 0, duration: 0.25 });
        gsap.to(dotEl, { scale: interactive ? 0 : 1, duration: 0.25 });
      };
      const leave = () => {
        shown = false;
        gsap.to([ringEl, dotEl], { opacity: 0, duration: 0.2 });
      };

      window.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerover', over, { passive: true });
      document.documentElement.addEventListener('pointerleave', leave);
      return () => {
        window.removeEventListener('pointermove', move);
        document.removeEventListener('pointerover', over);
        document.documentElement.removeEventListener('pointerleave', leave);
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden="true">
      <div ref={ring} className="absolute top-0 left-0 grid size-9 place-items-center rounded-full border border-bone/70 opacity-0">
        <span ref={label} className="font-mono text-[4px] font-semibold tracking-[0.1em] text-ink-0 uppercase opacity-0" />
      </div>
      <div ref={dot} className="absolute top-0 left-0 size-1.5 rounded-full bg-signal opacity-0" />
    </div>
  );
}
