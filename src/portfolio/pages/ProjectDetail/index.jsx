import { useLayoutEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { flight } from '../../motion/flight';
import { gsap, MOTION } from '../../motion/gsap';
import LiquidImage from '../../motion/LiquidImage';
import { useGsap } from '../../motion/useGsap';
import { LAYERS, byTier, getProject, projectHref } from '../../data/projects';
import { useLang } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import Button from '../../../shared/ui/Button';
import ProjectMark from '../../components/ProjectMark';
import Badge from '../../../shared/ui/Badge';
import NotFound from '../NotFound';

const H2 =
  'mb-4 border-b border-line pb-3 font-mono text-fine font-medium tracking-[0.08em] text-bone-faint uppercase';

const ProjectDetail = () => {
  const { key } = useParams();
  const { c, t } = useLang();
  const project = getProject(key);

  usePageMeta({
    title: project ? `${project.name} — Võ Gia Huy` : c.project.notFoundTitle,
    description: project ? t(project.summary) : c.project.notFoundBody,
  });

  const cover = useRef(null);

  // A picture flew here from the page before (see motion/flight.js): a copy of it travels from where it
  // was to where the cover is, and the cover shows once it lands.
  useLayoutEffect(() => {
    const trip = flight.take();
    const img = cover.current;
    if (!trip || !img) return undefined;
    const clone = document.createElement('img');
    clone.src = trip.src;
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'fixed',
      zIndex: 96,
      left: `${trip.rect.left}px`,
      top: `${trip.rect.top}px`,
      width: `${trip.rect.width}px`,
      height: `${trip.rect.height}px`,
      objectFit: 'cover',
      objectPosition: 'left top',
      borderRadius: trip.radius,
      pointerEvents: 'none',
      boxShadow: '0 40px 120px -20px rgb(0 0 0 / 0.6)',
    });
    document.body.appendChild(clone);
    img.style.visibility = 'hidden';
    let tween = null;
    // the page scrolls to the top on the next frame: measure where the cover is after that
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const to = img.getBoundingClientRect();
        tween = gsap.to(clone, {
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
          borderRadius: getComputedStyle(img.parentElement).borderRadius,
          duration: 1.15,
          ease: 'expo.inOut',
          onComplete: () => {
            img.style.visibility = '';
            gsap.to(clone, { opacity: 0, duration: 0.3, onComplete: () => clone.remove() });
          },
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      tween?.kill();
      clone.remove();
      img.style.visibility = '';
    };
  }, [project?.slug]);

  // the cover folds back like a page as it scrolls away
  const fold = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      const frame = ref.current?.querySelector('[data-fold]');
      if (!frame) return;
      gsap.to(frame, {
        rotateX: 24,
        scale: 0.9,
        opacity: 0.55,
        transformOrigin: '50% 100%',
        transformPerspective: 1400,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top 20%', end: 'bottom top', scrub: true },
      });
    });
  }, [project?.slug]);

  if (!project) return <NotFound variant="project" />;

  const sequence = [...byTier('featured'), ...byTier('lab')];
  const index = sequence.findIndex((p) => p.slug === project.slug);
  const next = index >= 0 ? sequence[(index + 1) % sequence.length] : null;

  return (
    <article ref={fold} className="pt-[calc(var(--spacing-header)+40px)] pb-section">
      <div className="wrap">
        <Link
          to="/#work"
          className="inline-flex gap-2 py-2 font-mono text-fine text-bone-dim transition-colors hover:text-signal"
        >
          <span aria-hidden="true">←</span> {c.project.back}
        </Link>

        <header className="pt-[clamp(32px,6vw,72px)] pb-[clamp(32px,5vw,56px)]">
          <p className="font-mono text-fine tracking-[0.08em] text-signal uppercase">
            {t(project.kind)} · {project.year}
          </p>
          <h1 className="mt-4 mb-5 font-display text-display">{project.name}</h1>
          <p className="max-w-[40ch] font-display text-h3 leading-[1.2] text-bone-dim">{t(project.tagline)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {project.links.map((l, i) => (
              <Button fill key={l.url} href={l.url} variant={i === 0 ? 'primary' : 'ghost'} icon="↗">
                {l.label === 'Live' ? c.work.live : l.label}
              </Button>
            ))}
          </div>
        </header>

        <div data-fold className="relative aspect-[16/8] overflow-hidden rounded-card border border-line-strong bg-ink-2 will-change-transform">
          {project.cover ? (
            <LiquidImage
              ref={cover}
              src={project.cover}
              alt=""
              width="1600"
              height="900"
              className="size-full object-cover object-left-top"
            />
          ) : (
            <ProjectMark project={project} label="" />
          )}
        </div>

        <div className="mt-[clamp(48px,7vw,96px)] grid gap-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-24">
          <div className="grid max-w-[68ch] gap-12 text-bone-dim">
            <section aria-labelledby="ov">
              <h2 id="ov" className={H2}>
                {c.project.overview}
              </h2>
              <p className="text-lead leading-[1.6] text-bone">{t(project.summary)}</p>
            </section>

            {project.role && (
              <section aria-labelledby="role">
                <h2 id="role" className={H2}>
                  {c.project.role}
                </h2>
                <p>{t(project.role)}</p>
              </section>
            )}

            {project.decisions.length > 0 && (
              <section aria-labelledby="notes">
                <h2 id="notes" className={H2}>
                  {c.project.decisions}
                </h2>
                <ol>
                  {project.decisions.map((d, i) => (
                    <li key={d.en} className="grid grid-cols-[40px_1fr] border-b border-line py-4">
                      <span className="pt-[0.2em] font-mono text-fine text-signal">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p>{t(d)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside aria-labelledby="stk">
            <h2 id="stk" className={H2}>
              {c.project.stack}
            </h2>
            <dl className="grid gap-5">
              {LAYERS.map((layer) => (
                <div key={layer}>
                  <dt className="mb-2 font-display text-lead">{c.stack.layers[layer]}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {project.layers[layer].length ? (
                      project.layers[layer].map((tech) => <Badge key={tech}>{tech}</Badge>)
                    ) : (
                      <span className="text-bone-faint">{c.project.nolayer}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        {next && (
          <Link
            to={projectHref(next)}
            className="group mt-[clamp(64px,9vw,120px)] grid gap-2 border-y border-line-strong py-8 text-bone-dim"
          >
            <span className="mono">{c.project.next}</span>
            <span className="font-display text-h2 leading-none text-bone transition-colors duration-200 group-hover:text-signal">
              {next.name} <span aria-hidden="true">→</span>
            </span>
          </Link>
        )}
      </div>
    </article>
  );
};

export default ProjectDetail;
