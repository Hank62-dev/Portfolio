import { useState } from 'react';
import { Link } from 'react-router-dom';
import { byTier, projectHref } from '../../data/projects';
import { useLang } from '../../lib/i18n';
import { clsx } from '../../lib/format';
import { gsap, FINE_POINTER, MOTION, ScrollTrigger } from '../../motion/gsap';
import SplitReveal from '../../motion/SplitReveal';
import { useGsap } from '../../motion/useGsap';
import SectionTitle from '../../components/common/SectionTitle';
import ProjectMark from '../../components/ui/ProjectMark';
import Badge from '../../design-system/Badge';

const topTech = (p) => [...p.layers.interface, ...p.layers.service, ...p.layers.data].slice(0, 5);

// A compact stack summary for table rows: first few technologies, then "+N".
const archiveStack = (p) => {
  const all = [...p.layers.interface, ...p.layers.service, ...p.layers.data];
  if (!all.length) return '—';
  const shown = all.slice(0, 5).join(' · ');
  return all.length > 5 ? `${shown} +${all.length - 5}` : shown;
};

const Cover = ({ project, parallax = false }) =>
  project.cover ? (
    <img
      src={project.cover}
      alt=""
      loading="lazy"
      width="1600"
      height="900"
      data-parallax={parallax || undefined}
      className={clsx('size-full object-cover object-left-top', parallax && 'scale-[1.18]')}
    />
  ) : (
    <ProjectMark project={project} label="" />
  );

// Table cells share one look; the header row and the row-header override a few properties.
const CELL = 'border-t border-line py-3.5 pr-4 text-left align-top font-normal';
const HEAD =
  'border-b border-line-strong py-3.5 pr-4 text-left align-top font-mono text-[0.72rem] font-normal tracking-[0.08em] text-bone-faint uppercase';
const EXT_LINK = 'border-b border-line-strong text-bone hover:border-signal hover:text-signal';

const Work = () => {
  const { c, t } = useLang();
  const featured = byTier('featured');
  const archive = byTier('archive');
  const [activeSlug, setActiveSlug] = useState(featured[0].slug);

  const scope = useGsap(({ scope: ref, mm }) => {
    // With a real mouse: a cover floats beside the pointer and trails it, leaning into the movement.
    mm.add(`${MOTION} and ${FINE_POINTER}`, () => {
      const root = ref.current;
      const list = root.querySelector('[data-list]');
      const card = root.querySelector('[data-preview]');
      gsap.set(card, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.8 });
      const moveX = gsap.quickTo(card, 'x', { duration: 0.7, ease: 'power3' });
      const moveY = gsap.quickTo(card, 'y', { duration: 0.7, ease: 'power3' });
      const lean = gsap.quickTo(card, 'rotation', { duration: 0.5, ease: 'power3' });
      let lastX = 0;

      const onMove = (e) => {
        moveX(e.clientX + Math.min(260, window.innerWidth * 0.18));
        moveY(e.clientY);
        lean(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.5));
        lastX = e.clientX;
      };
      const show = () => gsap.to(card, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out', overwrite: 'auto' });
      const hide = () => gsap.to(card, { opacity: 0, scale: 0.8, rotation: 0, duration: 0.4, ease: 'power3.in', overwrite: 'auto' });

      list.addEventListener('pointermove', onMove);
      list.addEventListener('pointerenter', show);
      list.addEventListener('pointerleave', hide);
      return () => {
        list.removeEventListener('pointermove', onMove);
        list.removeEventListener('pointerenter', show);
        list.removeEventListener('pointerleave', hide);
      };
    });

    mm.add(MOTION, () => {
      const root = ref.current;
      // Row rules draw in, then the row content settles.
      root.querySelectorAll('[data-row]').forEach((row) => {
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } })
          .from(row.querySelector('[data-rule]'), { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out' })
          .from(row.querySelectorAll('[data-row-fade]'), { y: 28, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.15);
      });
      // Covers drift against the scroll while they cross the screen (phones and reduced-pointer layouts).
      root.querySelectorAll('[data-parallax]').forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -7 },
          { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: true, start: 'top bottom', end: 'bottom top' } }
        );
      });
      // The archive table's rows arrive in a quick cascade.
      ScrollTrigger.batch(root.querySelectorAll('[data-archive-row]'), {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => gsap.from(batch, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }),
      });
    });
  }, [c]);

  return (
    <section id="work" ref={scope} className="relative py-section" aria-labelledby="work-title">
      <div className="wrap">
        <SectionTitle id="work-title" index="01" label={c.work.label} title={c.work.title} lede={c.work.lede} />

        <ol data-list className="relative">
          {featured.map((p, i) => (
            <li key={p.slug} data-row className="group relative isolate">
              <i data-rule className="absolute inset-x-0 top-0 h-px bg-line-strong" aria-hidden="true" />
              {/* a warm wash climbs the row on hover */}
              <i
                className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-gradient-to-t from-signal/10 to-transparent transition-transform duration-700 ease-out-expo group-hover:scale-y-100"
                aria-hidden="true"
              />
              <Link
                to={projectHref(p)}
                data-cursor="view"
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-9 xs:grid-cols-[48px_minmax(0,1fr)_auto] lg:py-12"
                onPointerEnter={() => setActiveSlug(p.slug)}
                onFocus={() => setActiveSlug(p.slug)}
              >
                <span data-row-fade className="hidden pt-[1.1em] font-mono text-fine text-bone-faint xs:block">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid gap-3 transition-transform duration-700 ease-out-expo group-hover:translate-x-3 group-focus-visible:translate-x-3">
                  <SplitReveal
                    key={p.name}
                    as="span"
                    variant="chars"
                    start="top 90%"
                    className="block font-display text-[clamp(2.6rem,1.4rem+6.5vw,7rem)] leading-[0.95] tracking-[-0.01em] transition-colors duration-300 group-hover:text-signal"
                  >
                    {p.name}
                  </SplitReveal>
                  <span data-row-fade className="max-w-[52ch] text-bone-dim">
                    {t(p.tagline)}
                  </span>
                  <span data-row-fade className="mt-1 flex flex-wrap gap-1.5">
                    {topTech(p).map((tech) => (
                      <Badge key={tech}>{tech}</Badge>
                    ))}
                  </span>
                </span>
                <span data-row-fade className="flex flex-col items-end gap-2 pt-[1.4em] text-bone-dim">
                  <span className="mono">{p.year}</span>
                  <span
                    className="text-[2rem] leading-none transition-[rotate,translate,color] duration-700 ease-out-expo group-hover:translate-x-1.5 group-hover:-rotate-45 group-hover:text-signal"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </span>
              </Link>

              {/* Without a mouse (or with reduced motion) there is no floating preview: show the cover inline */}
              <div
                className="mb-9 aspect-[16/10] max-w-[640px] overflow-hidden rounded-card border border-line fine:motion-safe:hidden"
                aria-hidden="true"
              >
                <Cover project={p} parallax />
              </div>
            </li>
          ))}
          <li className="border-t border-line-strong" aria-hidden="true" />
        </ol>

        {/* The floating preview. It follows the pointer over the list; each cover wipes in over the last. */}
        <div
          data-preview
          className="pointer-events-none fixed top-0 left-0 z-30 hidden aspect-[16/10] w-[min(380px,32vw)] overflow-hidden rounded-card border border-line-strong bg-ink-2 shadow-pop fine:motion-safe:block"
          aria-hidden="true"
        >
          {featured.map((p) => (
            <div
              key={p.slug}
              className={clsx(
                'absolute inset-0 transition-[clip-path] duration-700 ease-out-expo',
                p.slug === activeSlug ? 'z-10 [clip-path:inset(0)]' : 'z-0 [clip-path:inset(0_0_100%_0)]'
              )}
            >
              <Cover project={p} />
            </div>
          ))}
          <p className="absolute right-3 bottom-3 z-20 rounded-full bg-ink-0/80 px-2.5 py-1 font-mono text-[0.68rem] tracking-[0.06em] text-signal uppercase backdrop-blur">
            {t(featured.find((p) => p.slug === activeSlug).kind)}
          </p>
        </div>

        <div className="mt-[clamp(72px,9vw,128px)]">
          <h3 className="font-display text-h3">{c.work.also}</h3>
          <p className="mt-2 mb-7 text-bone-dim">{c.work.alsoLede}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-fine">
              <thead>
                <tr>
                  <th scope="col" className={HEAD}>{c.work.colName}</th>
                  <th scope="col" className={HEAD}>{c.work.colWhat}</th>
                  <th scope="col" className={HEAD}>{c.work.colStack}</th>
                  <th scope="col" className={HEAD}>{c.work.colYear}</th>
                  <th scope="col" className={HEAD}>{c.work.colLinks}</th>
                </tr>
              </thead>
              <tbody>
                {archive.map((p) => (
                  <tr key={p.slug} data-archive-row className="transition-colors duration-300 hover:bg-ink-1/70">
                    <th scope="row" className={clsx(CELL, 'font-medium whitespace-nowrap text-bone')}>
                      {p.decisions.length > 0 ? (
                        <Link to={projectHref(p)} className={EXT_LINK}>
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </th>
                    <td className={clsx(CELL, 'text-bone-dim')}>{t(p.tagline)}</td>
                    <td className={clsx(CELL, 'font-mono text-bone-dim')}>{archiveStack(p)}</td>
                    <td className={clsx(CELL, 'mono text-bone-dim')}>{p.year}</td>
                    <td className={clsx(CELL, 'text-bone-dim')}>
                      <div className="flex flex-wrap gap-x-3.5 gap-y-1 whitespace-nowrap">
                        {p.links.map((l) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className={EXT_LINK}>
                            {l.label === 'Live' ? c.work.live : l.label} ↗
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Work;
