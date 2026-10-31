import { Link } from 'react-router-dom';
import { byTier, projectHref } from '../../data/projects';
import { useLang } from '../../lib/i18n';
import { clsx } from '../../lib/format';
import { usePointerGlow, useTilt } from '../../hooks/useMotion';
import { gsap, MOTION, ScrollTrigger } from '../../motion/gsap';
import ScrambleText from '../../motion/ScrambleText';
import { useGsap } from '../../motion/useGsap';
import SectionTitle from '../../components/common/SectionTitle';
import Badge from '../../design-system/Badge';

/** A lab card: it leans toward the pointer, a warm spotlight follows it, and the cover zooms in. */
const LabCard = ({ project: p, lead, open }) => {
  const { t } = useLang();
  const glow = usePointerGlow();
  const tilt = useTilt(3);

  return (
    <li
      data-lab-card
      ref={(el) => {
        glow.current = el;
        tilt.current = el;
      }}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-card border border-line-strong bg-ink-1/80 backdrop-blur-sm transition-[border-color,transform] duration-500 ease-out-expo will-change-transform hover:border-signal/60',
        lead && 'md:col-span-full md:grid md:grid-cols-[1.2fr_1fr]'
      )}
    >
      {/* the spotlight: a radial wash centred on the pointer (see usePointerGlow) */}
      <i
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 [background:radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,50%),rgb(255_91_46/0.13),transparent_65%)] fine:group-hover:opacity-100"
        aria-hidden="true"
      />
      {lead && p.cover && (
        <div className="aspect-[16/7] overflow-hidden border-b border-line bg-black md:aspect-auto md:border-r md:border-b-0">
          <img
            src={p.cover}
            alt=""
            loading="lazy"
            width="1846"
            height="910"
            className="size-full object-cover transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.06]"
          />
        </div>
      )}
      <div className={clsx('relative flex flex-1 flex-col gap-3 p-6', lead && 'md:justify-center md:p-10')}>
        <p className="font-mono text-[0.72rem] tracking-[0.08em] text-signal uppercase">{t(p.kind)}</p>
        <h3 className="font-display text-[clamp(1.8rem,1.2rem+2vw,3rem)] leading-none">
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
          className="mt-auto inline-flex items-center gap-2 self-start pt-3 font-mono text-fine text-bone transition-colors hover:text-signal after:absolute after:inset-0 after:content-['']"
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

const Lab = () => {
  const { c } = useLang();
  const items = byTier('lab');

  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      ScrollTrigger.batch(ref.current.querySelectorAll('[data-lab-card]'), {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 70, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
            { y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath' }
          ),
      });
    });
  }, []);

  return (
    <section id="lab" ref={scope} className="relative py-section" aria-labelledby="lab-title">
      <div className="wrap">
        <SectionTitle id="lab-title" index="03" label={c.lab.label} title={c.lab.title} lede={c.lab.lede} />

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p, i) => (
            <LabCard key={p.slug} project={p} lead={i === 0} open={c.lab.open} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Lab;
