import { useLang } from '../../i18n';
import { gsap, DESKTOP, MOTION } from '../../motion/gsap';
import { useGsap } from '../../motion/useGsap';

/**
 * A breath between two sections: one line of enormous type. On wide screens it holds the screen while
 * the two halves slide together, then the full stop grows until the whole screen is the accent colour,
 * naming the next section, and that colour scrolls away like a curtain. Elsewhere it is simply the line.
 */
export default function Interlude() {
  const { c } = useLang();
  const [first, second] = c.interlude;

  const scope = useGsap(
    ({ scope: ref, mm }) => {
      mm.add(`${MOTION} and ${DESKTOP}`, () => {
        const root = ref.current;
        const stage = root.querySelector('[data-stage]');
        const text = root.querySelector('[data-text]');
        const dot = root.querySelector('[data-dot]');
        const flood = root.querySelector('[data-flood]');
        // where the dot is, relative to the text (for the zoom) and to the stage (for the flood)
        const origin = () => `${dot.offsetLeft + dot.offsetWidth / 2}px ${dot.offsetTop + dot.offsetHeight / 2}px`;
        const centre = () => {
          const d = dot.getBoundingClientRect();
          const s = stage.getBoundingClientRect();
          return { x: d.left - s.left + d.width / 2, y: d.top - s.top + d.height / 2, r: d.width / 2 };
        };
        let at = { x: 0, y: 0, r: 0 };
        const flood0 = () => {
          at = centre();
          return `circle(${at.r}px at ${at.x}px ${at.y}px)`;
        };
        const flood1 = () => `circle(${Math.hypot(window.innerWidth, window.innerHeight)}px at ${at.x}px ${at.y}px)`;

        gsap
          .timeline({
            scrollTrigger: { trigger: root, start: 'top top', end: '+=200%', pin: stage, scrub: 0.7, invalidateOnRefresh: true },
          })
          .fromTo('[data-half="a"]', { xPercent: -60, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power3.out', duration: 0.3 }, 0)
          .fromTo('[data-half="b"]', { xPercent: 60, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'power3.out', duration: 0.3 }, 0)
          .fromTo(dot, { scale: 0 }, { scale: 1, ease: 'back.out(3)', duration: 0.12 }, 0.24)
          .set(flood, { clipPath: flood0, opacity: 1 }, 0.42)
          .to(text, { scale: 6, opacity: 0, transformOrigin: origin, ease: 'power2.in', duration: 0.38 }, 0.42)
          .to(flood, { clipPath: flood1, ease: 'power2.in', duration: 0.38 }, 0.42)
          .fromTo('[data-next]', { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'expo.out', duration: 0.14 }, 0.8);
      });
    },
    [c]
  );

  return (
    <section ref={scope} className="relative" aria-label={`${first} ${second}`}>
      <div data-stage className="relative grid min-h-[60svh] place-items-center overflow-hidden lg:h-svh">
        <p
          data-text
          className="wrap relative text-center font-display text-[clamp(2.6rem,1rem+7vw,9.5rem)] leading-[0.95] tracking-[-0.02em]"
          aria-hidden="true"
        >
          <span data-half="a" className="block">
            {first}
          </span>
          <span data-half="b" className="block">
            <span className="serif-accent">{second}</span>
            <span
              data-dot
              className="ml-[0.04em] inline-block size-[0.17em] rounded-full bg-signal align-baseline"
            />
          </span>
        </p>
        {/* the accent colour that grows out of the full stop */}
        {/* the accent colour that grows out of the full stop, naming what comes next; it then scrolls away like a curtain */}
        <div data-flood className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden bg-signal opacity-0" aria-hidden="true">
          <p data-next className="font-mono text-fine tracking-[0.14em] text-ink-0 uppercase">
            02 — {c.stack.label}
          </p>
        </div>
      </div>
    </section>
  );
}
