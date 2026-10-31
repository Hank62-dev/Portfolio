import { useState } from 'react';
import { Link } from 'react-router-dom';
import { byTier, projectHref } from '../../data/projects';
import { useLang } from '../../lib/i18n';
import { clsx } from '../../lib/format';
import { useTilt } from '../../hooks/useMotion';
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

const Cover = ({ project }) =>
  project.cover ? (
    <img
      src={project.cover}
      alt=""
      loading="lazy"
      width="1600"
      height="900"
      className="size-full object-cover object-left-top"
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
  const active = featured.find((p) => p.slug === activeSlug) ?? featured[0];
  const tiltRef = useTilt(4);

  return (
    <section id="work" className="relative py-section" aria-labelledby="work-title">
      <div className="wrap">
        <SectionTitle id="work-title" index="01" label={c.work.label} title={c.work.title} lede={c.work.lede} />

        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <ol className="border-t border-line-strong">
            {featured.map((p, i) => (
              <li
                key={p.slug}
                className="border-b border-line-strong"
                data-reveal
                style={{ '--reveal-delay': `${i * 0.06}s` }}
              >
                <Link
                  to={projectHref(p)}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-7 xs:grid-cols-[40px_minmax(0,1fr)_auto]"
                  onMouseEnter={() => setActiveSlug(p.slug)}
                  onFocus={() => setActiveSlug(p.slug)}
                >
                  <span className="hidden pt-[0.7em] font-mono text-fine text-bone-faint xs:block">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="grid gap-2.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-2 group-focus-visible:translate-x-2">
                    <span
                      className={clsx(
                        'font-display text-h2 leading-none transition-colors duration-200 group-hover:text-signal',
                        p.slug === active.slug && 'text-signal'
                      )}
                    >
                      {p.name}
                    </span>
                    <span className="max-w-[52ch] text-bone-dim">{t(p.tagline)}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {topTech(p).map((tech) => (
                        <Badge key={tech}>{tech}</Badge>
                      ))}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-2 pt-[0.9em] text-bone-dim">
                    <span className="mono">{p.year}</span>
                    <span
                      className="text-[1.4rem] leading-none transition-[translate,color] duration-500 ease-out-expo group-hover:translate-x-1.5 group-hover:text-signal"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </span>
                </Link>

                {/* Without hover there is no preview pane: show the cover inline instead */}
                <div
                  className="mb-7 aspect-[16/10] max-w-[640px] overflow-hidden rounded-card border border-line lg:hidden"
                  aria-hidden="true"
                >
                  <Cover project={p} />
                </div>
              </li>
            ))}
          </ol>

          <aside className="sticky top-[calc(var(--spacing-header)+32px)] hidden pt-7 lg:block" aria-hidden="true">
            <div
              className="relative aspect-[16/10] overflow-hidden rounded-card border border-line-strong bg-ink-2 transition-transform duration-500 ease-out-expo will-change-transform"
              ref={tiltRef}
            >
              {featured.map((p) => (
                <div
                  key={p.slug}
                  className={clsx(
                    'absolute inset-0 transition-[opacity,scale] duration-500 ease-out-expo',
                    p.slug === active.slug ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
                  )}
                >
                  <Cover project={p} />
                </div>
              ))}
            </div>
            <p className="mt-5 font-mono text-fine tracking-[0.06em] text-signal uppercase">{t(active.kind)}</p>
            <p className="mt-2.5 max-w-[52ch] text-bone-dim">{t(active.summary)}</p>
          </aside>
        </div>

        <div className="mt-[clamp(72px,9vw,128px)]" data-reveal>
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
                  <tr key={p.slug}>
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
