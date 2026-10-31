import { Fragment, useMemo } from 'react';
import { facts, profile, GITHUB_USERNAME } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import { clsx, timeAgo } from '../../lib/format';
import { jumpTo } from '../../lib/scroll';
import { usePointerGlow } from '../../hooks/useMotion';
import Button from '../../design-system/Button';

// The blueprint grid is two 1px gradients; the glow layer repeats it in the accent colour.
const GRID_LINES = 'bg-[size:72px_72px]';

const LatestPush = ({ github }) => {
  const { c, lang } = useLang();

  const latest = useMemo(() => {
    const repos = github.data?.repos ?? [];
    return repos.filter((r) => r.pushedAt).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))[0] ?? null;
  }, [github.data]);

  if (github.status === 'loading') return <span className="text-bone-dim">{c.hero.latestLoading}</span>;
  if (!latest) return <span className="text-bone-dim">{c.hero.latestUnavailable}</span>;

  return (
    <a
      href={latest.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-2.5"
    >
      <span className="size-2 shrink-0 animate-pulse-ring rounded-full bg-signal" aria-hidden="true" />
      <span>
        <strong className="transition-colors group-hover:text-signal">{latest.name}</strong>
        <span className="text-bone-dim"> · {timeAgo(latest.pushedAt, lang)}</span>
      </span>
    </a>
  );
};

const Hero = ({ github }) => {
  const { c, t } = useLang();
  const glowRef = usePointerGlow();

  // The sheet's rows enter one after another; the last is the live GitHub row.
  const rows = [
    { key: 'where', label: c.hero.where, value: t(profile.location) },
    ...facts.map((f) => ({ key: f.id, label: t(f.label), value: t(f.value) })),
    { key: 'push', label: c.hero.latest, value: <LatestPush github={github} /> },
  ];

  return (
    <section
      id="top"
      ref={glowRef}
      className="group relative flex min-h-svh items-center overflow-hidden pt-[calc(var(--spacing-header)+48px)] pb-[72px]"
      aria-labelledby="hero-title"
    >
      <div
        className={clsx(
          'absolute inset-0 opacity-55 [mask-image:linear-gradient(to_bottom,#000_0%,transparent_85%)]',
          '[background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)]',
          GRID_LINES
        )}
        aria-hidden="true"
      />
      {/* Same grid in the accent colour, revealed only around the pointer (see usePointerGlow). */}
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 fine:group-hover:opacity-100',
          '[background-image:linear-gradient(rgb(255_91_46/0.7)_1px,transparent_1px),linear-gradient(90deg,rgb(255_91_46/0.7)_1px,transparent_1px)]',
          '[mask-image:radial-gradient(220px_circle_at_var(--mx,-400px)_var(--my,-400px),#000,transparent_70%)]',
          GRID_LINES
        )}
        aria-hidden="true"
      />

      <div className="wrap relative grid items-end gap-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-[72px]">
        <div>
          <p
            className="enter mb-7 font-mono text-fine tracking-[0.1em] text-bone-dim uppercase"
            style={{ '--d': 0 }}
          >
            {c.hero.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="font-display text-display tracking-[-0.01em]"
          >
            {c.hero.title.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && ' '}
                <span className="line-mask">
                  <span className={clsx('line-inner enter-line', i === 1 && 'serif-accent')} style={{ '--i': i }}>
                    {line}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p
            className="enter mt-8 max-w-[54ch] text-lead leading-[1.55] text-bone-dim"
            style={{ '--d': 0.55 }}
          >
            {c.hero.lede}
          </p>
          <div className="enter mt-10 flex flex-wrap gap-3" style={{ '--d': 0.7 }}>
            <Button to="/#work" icon="→" onClick={jumpTo('work')}>
              {c.hero.ctaWork}
            </Button>
            <Button to="/#contact" variant="ghost" onClick={jumpTo('contact')}>
              {c.hero.ctaContact}
            </Button>
          </div>
        </div>

        <div
          className="enter rounded-card border border-line-strong bg-ink-1"
          style={{ '--d': 0.45 }}
          role="group"
          aria-label={c.hero.sheet}
        >
          <div className="flex justify-between gap-3 border-b border-line-strong px-[18px] py-3 font-mono text-fine tracking-[0.08em] text-bone-dim uppercase">
            <span>{c.hero.sheet}</span>
            <span>@{GITHUB_USERNAME}</span>
          </div>
          <dl className="grid">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className="enter grid gap-1 border-b border-line px-[18px] py-3.5 last:border-b-0"
                style={{ '--d': 0.7 + i * 0.08 }}
              >
                <dt className="font-mono text-[0.72rem] tracking-[0.08em] text-bone-faint uppercase">{row.label}</dt>
                <dd className="text-body">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default Hero;
