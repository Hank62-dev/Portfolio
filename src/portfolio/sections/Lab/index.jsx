import { Link } from 'react-router-dom';
import { byTier, projectHref } from '../../data/projects';
import { useLang } from '../../i18n';
import { clsx } from '../../../shared/lib/format';
import { usePointerGlow } from '../../../shared/hooks/useMotion';
import { gsap, DESKTOP, MOTION } from '../../motion/gsap';
import { motionStore } from '../../motion/store';
import Distort from '../../motion/Distort';
import ScrambleText from '../../motion/ScrambleText';
import { useGsap } from '../../motion/useGsap';
import SectionTitle from '../../components/SectionTitle';
import ProjectMark from '../../components/ProjectMark';
import Badge from '../../../shared/ui/Badge';

const pad = (n) => String(n).padStart(2, '0');

/** One specimen: a picture on top (the screenshot, or the project's own schematic), the notes below. */
const LabCard = ({ project: p, index, total, open }) => {
  const { t } = useLang();
  const glow = usePointerGlow();

  return (
    <li
      data-lab-card
      ref={glow}
      className="group relative flex shrink-0 flex-col overflow-hidden rounded-card border border-line-strong bg-ink-1/90 backdrop-blur-sm transition-[border-color] duration-500 hover:border-signal/70 lg:h-[min(72svh,640px)] lg:w-[min(30rem,34vw)] lg:[transform-style:preserve-3d] max-lg:w-[min(82vw,26rem)] max-lg:snap-center"
    >
      {/* a warm spotlight under the pointer */}
      <i
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 [background:radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,50%),rgb(255_91_46/0.16),transparent_65%)] fine:group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden border-b border-line bg-ink-2 lg:aspect-auto lg:flex-[1.15]">
        <Distort className="absolute inset-0 transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.07]">
          {p.cover ? (
            <img src={p.cover} alt="" loading="lazy" width="1846" height="910" className="size-full object-cover" />
          ) : (
            <ProjectMark project={p} label="" />
          )}
        </Distort>
        {/* a scan line sweeps the picture on hover */}
        <i
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] -translate-y-2 bg-signal opacity-0 shadow-[0_0_24px_4px_rgb(255_91_46/0.6)] group-hover:animate-scan"
          aria-hidden="true"
        />
        <span className="absolute top-3 left-3 rounded-full bg-ink-0/80 px-2.5 py-1 font-mono text-[0.68rem] tracking-[0.08em] text-bone backdrop-blur">
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col gap-3 p-6">
        <p className="font-mono text-[0.72rem] tracking-[0.08em] text-signal uppercase">{t(p.kind)}</p>
        <h3 className="font-display text-[clamp(1.9rem,1.2rem+2vw,3rem)] leading-none">
          <ScrambleText text={p.name} hover />
        </h3>
        <p className="text-bone-dim">{t(p.tagline)}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[...p.layers.interface, ...p.layers.service].slice(0, 4).map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
        </div>
        <Link
          to={projectHref(p)}
          data-cursor="open"
          className="mt-auto inline-flex items-center gap-2 self-start pt-3 font-mono text-fine text-bone transition-colors hover:text-signal after:absolute after:inset-0 after:z-20 after:content-['']"
        >
          {open}{' '}
          <span aria-hidden="true" className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1.5">
            →
          </span>
          <span className="sr-only"> — {p.name}</span>
        </Link>
      </div>
    </li>
  );
};

/**
 * The lab as a drawer of specimens. On wide screens the section holds still while scrolling slides the
 * cards across, each turning on a curve as it passes the middle and leaning with the speed, over a huge
 * counter of the card in front. Phones (and reduced motion) get a row to swipe instead.
 */
const Lab = () => {
  const { c } = useLang();
  const items = byTier('lab');

  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(`${MOTION} and ${DESKTOP}`, () => {
      const root = ref.current;
      const pin = root.querySelector('[data-lab-pin]');
      const track = root.querySelector('[data-lab-track]');
      const cards = [...root.querySelectorAll('[data-lab-card]')];
      const counter = root.querySelector('[data-lab-count]');
      const bar = root.querySelector('[data-lab-bar]');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            gsap.set(bar, { scaleX: self.progress });
          },
        },
      });

      // Every frame, each card turns by how far it is from the middle of the screen, and the row leans with the speed.
      let skew = 0;
      let front = -1;
      const tick = () => {
        const mid = window.innerWidth / 2;
        let nearest = 0;
        let best = Infinity;
        skew += (gsap.utils.clamp(-8, 8, motionStore.velocity * -0.35) - skew) * 0.12;
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const d = (r.left + r.width / 2 - mid) / window.innerWidth;
          if (Math.abs(d) < best) {
            best = Math.abs(d);
            nearest = i;
          }
          const k = gsap.utils.clamp(-1.2, 1.2, d);
          gsap.set(card, {
            rotateY: k * -32,
            z: -Math.abs(k) * 260,
            y: Math.abs(k) * 40,
            skewX: skew,
            opacity: 1 - Math.min(0.55, Math.abs(k) * 0.5),
            transformPerspective: 1400,
          });
        });
        if (nearest !== front) {
          front = nearest;
          counter.textContent = pad(nearest + 1);
          gsap.fromTo(counter, { yPercent: 18, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', overwrite: true });
        }
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    });

    mm.add(MOTION, () => {
      gsap.from(ref.current.querySelectorAll('[data-lab-card]'), {
        y: 90,
        opacity: 0,
        duration: 1.4,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: ref.current.querySelector('[data-lab-track]'), start: 'top 85%', once: true },
      });
    });
  }, []);

  return (
    <section id="lab" ref={scope} className="relative" aria-labelledby="lab-title">
      <div data-lab-pin className="relative overflow-hidden py-section lg:flex lg:h-svh lg:flex-col lg:justify-center lg:py-0">
        {/* the number of the card in front, enormous and hollow, behind everything */}
        <p
          data-lab-count
          className="pointer-events-none absolute right-[-2vw] bottom-[-6vw] hidden font-display text-[38vw] leading-none text-transparent select-none [-webkit-text-stroke:1px_var(--color-line-strong)] lg:block"
          aria-hidden="true"
        >
          01
        </p>
        <div className="wrap relative w-full">
          <div data-lab-track className="lg:flex lg:w-max lg:items-center lg:gap-[3vw] lg:pr-[8vw] motion-reduce:lg:w-auto motion-reduce:lg:overflow-x-auto">
            <div className="shrink-0 lg:w-[min(34rem,36vw)] lg:pr-[2vw]">
              <SectionTitle id="lab-title" index="03" label={c.lab.label} title={c.lab.title} lede={c.lab.lede} stacked />
              <p className="flex items-center gap-3 font-mono text-[0.72rem] tracking-[0.1em] text-bone-faint uppercase max-lg:mb-6 max-lg:-mt-6">
                <span className="inline-block h-px w-12 bg-signal" aria-hidden="true" />
                {c.lab.scroll}
              </p>
            </div>
            <ul
              className={clsx(
                'flex gap-5 max-lg:-mx-gutter max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto max-lg:px-gutter max-lg:pb-4',
                'lg:items-center lg:gap-[3vw]'
              )}
            >
              {items.map((p, i) => (
                <LabCard key={p.slug} project={p} index={i} total={items.length} open={c.lab.open} />
              ))}
            </ul>
          </div>
          <div className="mt-10 hidden h-px bg-line lg:block" aria-hidden="true">
            <i data-lab-bar className="block h-px origin-left scale-x-0 bg-signal" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Lab;
