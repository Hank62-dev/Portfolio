import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectHref } from '../../data/projects';
import { useLang } from '../../i18n';
import { clsx } from '../../../shared/lib/format';
import { gsap, prefersReducedMotion } from '../../motion/gsap';
import { sound } from '../../motion/sound';
import Badge from '../../../shared/ui/Badge';

const pad = (n) => String(n).padStart(2, '0');
const techOf = (p) => [...p.layers.interface, ...p.layers.service, ...p.layers.data, ...(p.layers.delivery ?? [])];

/** A word that rolls on hover: each letter slides up and its copy comes up from below, one after another. */
export const RollText = ({ text, className }) => (
  <span className={clsx('relative inline-block overflow-hidden align-bottom whitespace-nowrap', className)}>
    <span className="sr-only">{text}</span>
    {[0, 1].map((copy) => (
      <span key={copy} className={clsx('block', copy === 1 && 'absolute inset-x-0 top-full')} aria-hidden="true">
        {[...text].map((char, i) => (
          <span
            key={i}
            className="inline-block whitespace-pre transition-transform duration-[650ms] ease-out-expo [transition-delay:calc(var(--i)*16ms)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none"
            style={{ '--i': i }}
          >
            {char}
          </span>
        ))}
      </span>
    ))}
  </span>
);

const Row = ({ project: p, index, open, onToggle }) => {
  const { c, t } = useLang();
  const panelId = useId();
  const drawer = useRef(null);
  const first = useRef(true);

  // the drawer opens to its height and closes back to nothing
  useLayoutEffect(() => {
    const el = drawer.current;
    if (first.current) {
      first.current = false;
      gsap.set(el, { height: open ? 'auto' : 0 });
      return;
    }
    if (prefersReducedMotion()) {
      gsap.set(el, { height: open ? 'auto' : 0 });
      return;
    }
    gsap.to(el, { height: open ? 'auto' : 0, duration: 0.8, ease: 'expo.out', overwrite: true });
    if (open) gsap.from(el.querySelectorAll('[data-drawer-fade]'), { y: 24, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.08 });
  }, [open]);

  return (
    <li data-archive-row className="border-b border-line">
      <h4>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          onPointerEnter={() => sound.tick()}
          className="group relative isolate grid w-full grid-cols-[2.2rem_minmax(0,1fr)_auto] items-center gap-x-4 overflow-hidden py-5 text-left md:grid-cols-[3rem_minmax(0,1.25fr)_minmax(0,1fr)_4rem_2rem] md:py-6"
        >
          {/* the row floods with the accent colour from the bottom; text turns ink over it */}
          <i
            className={clsx(
              'absolute inset-0 -z-10 origin-bottom bg-signal transition-transform duration-[700ms] ease-out-expo',
              open ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100'
            )}
            aria-hidden="true"
          />
          <span
            className={clsx(
              'pl-2 font-mono text-[0.72rem] transition-colors duration-300',
              open ? 'text-ink-0' : 'text-bone-faint group-hover:text-ink-0'
            )}
          >
            {pad(index + 1)}
          </span>
          <RollText
            text={p.name}
            className={clsx(
              'font-display text-[clamp(1.6rem,1.1rem+2.2vw,3.2rem)] leading-[1.1] transition-colors duration-300',
              open ? 'text-ink-0' : 'text-bone group-hover:text-ink-0'
            )}
          />
          <span
            className={clsx(
              'hidden text-fine transition-colors duration-300 md:block',
              open ? 'text-ink-0/80' : 'text-bone-dim group-hover:text-ink-0/80'
            )}
          >
            {t(p.tagline)}
          </span>
          <span
            className={clsx(
              'hidden font-mono text-fine transition-colors duration-300 md:block',
              open ? 'text-ink-0' : 'text-bone-dim group-hover:text-ink-0'
            )}
          >
            {p.year}
          </span>
          <span
            className={clsx(
              'pr-2 text-right text-[1.5rem] leading-none transition-[rotate,color] duration-500 ease-out-expo',
              open ? 'rotate-45 text-ink-0' : 'text-bone-dim group-hover:text-ink-0'
            )}
            aria-hidden="true"
          >
            +
          </span>
        </button>
      </h4>
      <div ref={drawer} id={panelId} role="region" aria-label={p.name} className="overflow-hidden" inert={open ? undefined : ''}>
        <div className="grid gap-6 py-7 md:grid-cols-[3rem_minmax(0,1.25fr)_minmax(0,1fr)] md:gap-x-4">
          <span className="max-md:hidden" />
          <div className="grid content-start gap-4">
            <p data-drawer-fade className="max-w-[48ch] text-lead text-bone-dim md:hidden">
              {t(p.tagline)}
            </p>
            {p.cover && (
              <div data-drawer-fade className="aspect-[16/9] max-w-[520px] overflow-hidden rounded-card border border-line-strong">
                <img src={p.cover} alt="" loading="lazy" className="size-full object-cover object-top" />
              </div>
            )}
            <div data-drawer-fade className="flex flex-wrap gap-1.5">
              {techOf(p).map((tech) => (
                <Badge key={tech}>{tech}</Badge>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-3">
            <p data-drawer-fade className="font-mono text-[0.72rem] tracking-[0.08em] text-bone-faint uppercase">
              {t(p.kind)} · {p.year}
            </p>
            <div data-drawer-fade className="flex flex-wrap gap-x-5 gap-y-2">
              {p.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="go"
                  className="border-b border-line-strong text-bone transition-colors hover:border-signal hover:text-signal"
                >
                  {l.label === 'Live' ? c.work.live : l.label} ↗
                </a>
              ))}
              {p.decisions.length > 0 && (
                <Link to={projectHref(p)} data-cursor="view" className="border-b border-signal text-signal">
                  {c.work.readCase} →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

/**
 * The rest of the work as an index: every project a line of big type that rolls and fills with colour
 * under the pointer, and opens to show what it was built with and where to see it. Filtered by year.
 */
export default function ArchiveIndex({ projects }) {
  const { c } = useLang();
  const years = useMemo(() => [...new Set(projects.map((p) => p.year))].sort((a, b) => b - a), [projects]);
  const [year, setYear] = useState(null);
  const [openSlug, setOpenSlug] = useState(null);
  const list = useRef(null);
  const shown = year ? projects.filter((p) => p.year === year) : projects;

  // a new filter: the rows come in again, one after another
  const firstFilter = useRef(true);
  useLayoutEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    if (prefersReducedMotion()) return;
    gsap.from(list.current.querySelectorAll('[data-archive-row]'), { y: 40, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
  }, [year]);

  const chip = (value, label, count) => (
    <button
      key={label}
      type="button"
      aria-pressed={year === value}
      onClick={() => {
        setYear(value);
        setOpenSlug(null);
      }}
      className={clsx(
        'min-h-[38px] rounded-full border px-3.5 font-mono text-fine transition-colors duration-200',
        year === value ? 'border-bone bg-bone text-ink-0' : 'border-line-strong text-bone-dim hover:border-bone hover:text-bone'
      )}
    >
      {label} <sup className="ml-0.5 text-[0.62rem] opacity-70">{count}</sup>
    </button>
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h3 className="font-display text-h3">{c.work.also}</h3>
          <p className="mt-2 text-bone-dim">{c.work.alsoLede}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={c.work.filterYear}>
          {chip(null, c.work.allYears, projects.length)}
          {years.map((y) => chip(y, String(y), projects.filter((p) => p.year === y).length))}
        </div>
      </div>
      <ul ref={list} className="border-t border-line-strong">
        {shown.map((p, i) => (
          <Row
            key={p.slug}
            project={p}
            index={i}
            open={openSlug === p.slug}
            onToggle={() => setOpenSlug((s) => (s === p.slug ? null : p.slug))}
          />
        ))}
      </ul>
    </div>
  );
}
