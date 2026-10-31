import { useMemo } from 'react';
import { GITHUB_USERNAME } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import { computeStreaks, lastDays, sumCounts } from '../../lib/contributions';
import { formatDate, timeAgo } from '../../lib/format';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../design-system/Button';
import CountUp from '../../components/ui/CountUp';

const DAYS = 28;

const PANEL = 'rounded-card border border-line-strong p-6';
const PANEL_TITLE = 'mb-5 font-mono text-fine font-medium tracking-[0.06em] text-bone-dim uppercase';
const NOTE = 'mt-4 text-fine text-bone-faint';

const Stat = ({ label, value }) => (
  // `col-span-full` on an orphaned last cell keeps the two-column mobile grid tidy
  <div className="flex flex-col justify-between gap-3 bg-ink-1 p-5 max-md:[&:last-child:nth-child(odd)]:col-span-full">
    <dt className="font-mono text-[0.72rem] tracking-[0.06em] text-bone-faint uppercase">{label}</dt>
    <dd className="font-display text-h2 leading-none">{value}</dd>
  </div>
);

const DailyBars = ({ days, label }) => {
  const max = Math.max(...days.map((d) => d.count), 1);
  const { lang } = useLang();
  const tickEvery = 7;

  return (
    <figure>
      <svg
        className="h-40 w-full overflow-visible"
        viewBox={`0 0 ${DAYS * 20} 160`}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        {days.map((d, i) => {
          const h = d.count === 0 ? 2 : Math.max(6, (d.count / max) * 130);
          return (
            <rect
              key={d.date}
              x={i * 20 + 3}
              y={140 - h}
              width="14"
              height={h}
              // bars grow from the baseline once the board is revealed (.in is added by useReveal)
              className={`origin-bottom [transform-box:fill-box] in:animate-grow-y in:[animation-delay:calc(.25s+var(--i,0)*22ms)] ${
                d.count === 0 ? 'fill-line-strong' : 'fill-signal hover:fill-bone'
              }`}
              style={{ '--i': i }}
            >
              <title>{`${formatDate(d.date, lang)}: ${d.count}`}</title>
            </rect>
          );
        })}
        <line x1="0" x2={DAYS * 20} y1="141" y2="141" className="stroke-line-strong" />
      </svg>
      <div
        className="relative mt-2 h-[22px] font-mono text-[0.68rem] text-bone-faint"
        aria-hidden="true"
      >
        {days.map((d, i) =>
          i % tickEvery === 0 || i === days.length - 1 ? (
            <span
              key={d.date}
              className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
              style={{ left: `${((i + 0.5) / DAYS) * 100}%` }}
            >
              {formatDate(d.date, lang)}
            </span>
          ) : null
        )}
      </div>
    </figure>
  );
};

const Activity = ({ github }) => {
  const { c, lang } = useLang();
  const { status, data, retry } = github;

  const derived = useMemo(() => {
    if (!data) return null;
    const days = data.contributions;
    const recent = days ? lastDays(days, DAYS) : null;

    const langCounts = {};
    (data.repos ?? []).forEach((r) => {
      if (r.language) langCounts[r.language] = (langCounts[r.language] ?? 0) + 1;
    });
    const languages = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const recentRepos = [...(data.repos ?? [])]
      .filter((r) => r.pushedAt)
      .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))
      .slice(0, 5);

    return {
      recent,
      yearTotal: days ? sumCounts(days) : null,
      activeDays: recent ? recent.filter((d) => d.count > 0).length : null,
      streaks: days ? computeStreaks(days) : null,
      recentTotal: recent ? sumCounts(recent) : 0,
      languages,
      recentRepos,
    };
  }, [data]);

  return (
    <section id="activity" className="relative py-section" aria-labelledby="activity-title">
      <div className="wrap">
        <SectionTitle
          id="activity-title"
          index="05"
          label={c.activity.label}
          title={c.activity.title}
          lede={c.activity.lede}
        />

        {status === 'loading' && !data && (
          <p className="rounded-card border border-dashed border-line-strong p-7 text-bone-dim" role="status">
            {c.activity.loading}
          </p>
        )}

        {status === 'error' && (
          <div className="rounded-card border border-dashed border-line-strong p-7 text-bone-dim" role="alert">
            <p>{c.activity.error}</p>
            <p className="mt-1.5 text-fine text-bone-faint">{c.activity.errorHelp}</p>
            <div className="mt-5 flex flex-wrap items-center gap-5">
              <Button variant="ghost" onClick={retry}>
                {c.activity.retry}
              </Button>
              <Button variant="link" href={`https://github.com/${GITHUB_USERNAME}`}>
                {c.activity.openProfile} ↗
              </Button>
            </div>
          </div>
        )}

        {data && derived && (
          <div className="grid gap-4" data-reveal>
            {/* dividers are the 1px gaps over a tinted background */}
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line-strong bg-line md:grid-cols-5">
              {data.user?.publicRepos != null && (
                <Stat label={c.activity.repos} value={<CountUp value={data.user.publicRepos} />} />
              )}
              {derived.yearTotal != null && (
                <Stat label={c.activity.contributions} value={<CountUp value={derived.yearTotal} duration={1800} />} />
              )}
              {derived.streaks && <Stat label={c.activity.streak} value={<CountUp value={derived.streaks.current} />} />}
              {derived.streaks && <Stat label={c.activity.longest} value={<CountUp value={derived.streaks.longest} />} />}
              {data.user?.createdAt && (
                <Stat
                  label={c.activity.joined}
                  value={formatDate(data.user.createdAt, lang, { month: 'short', year: 'numeric' })}
                />
              )}
            </dl>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              {derived.recent && (
                <section className={`${PANEL} lg:row-span-2`} aria-labelledby="chart-h">
                  <h3 id="chart-h" className={PANEL_TITLE}>
                    {c.activity.chart}
                  </h3>
                  <DailyBars days={derived.recent} label={c.activity.chartAlt(derived.recentTotal)} />
                  <p className={NOTE}>
                    {c.activity.active}: <strong className="font-medium text-bone">{derived.activeDays}</strong>
                  </p>
                </section>
              )}

              <section className={PANEL} aria-labelledby="lang-h">
                <h3 id="lang-h" className={PANEL_TITLE}>
                  {c.activity.languages}
                </h3>
                <ul className="grid gap-3">
                  {derived.languages.map(([name, n], i) => (
                    <li key={name} className="grid grid-cols-[96px_1fr_24px] items-center gap-3 text-fine">
                      <span>{name}</span>
                      <span className="h-1.5 rounded-[1px] bg-ink-3">
                        <i
                          className="block h-full origin-left rounded-[1px] bg-bone in:animate-grow-x in:[animation-delay:calc(.4s+var(--i,0)*90ms)]"
                          style={{ width: `${(n / derived.languages[0][1]) * 100}%`, '--i': i }}
                        />
                      </span>
                      <span className="mono">{n}</span>
                    </li>
                  ))}
                </ul>
                <p className={NOTE}>{c.activity.langNote}</p>
              </section>

              <section className={PANEL} aria-labelledby="recent-h">
                <h3 id="recent-h" className={PANEL_TITLE}>
                  {c.activity.recent}
                </h3>
                <ul>
                  {derived.recentRepos.map((r) => (
                    <li
                      key={r.name}
                      className="flex justify-between gap-4 border-b border-line py-2.5 text-fine last:border-b-0"
                    >
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-signal"
                      >
                        {r.name}
                      </a>
                      <span className="mono whitespace-nowrap text-bone-faint">{timeAgo(r.pushedAt, lang)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <p className="font-mono text-[0.72rem] text-bone-faint">
              {c.activity.updated} {timeAgo(new Date(data.fetchedAt).toISOString(), lang)} ·{' '}
              {c.activity.contribSource}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Activity;
