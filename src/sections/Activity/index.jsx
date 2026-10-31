import { useMemo, useState } from 'react';
import { GITHUB_USERNAME } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import { computeStreaks, heatmapCells, lastDays, sumCounts } from '../../lib/contributions';
import { formatDate, timeAgo } from '../../lib/format';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../design-system/Button';
import CountUp from '../../components/ui/CountUp';
import { gsap, MOTION, ScrollTrigger } from '../../motion/gsap';
import { useGsap } from '../../motion/useGsap';

const DAYS = 28;

const PANEL = 'rounded-card border border-line-strong bg-ink-1/50 p-6 backdrop-blur-sm';
const PANEL_TITLE = 'mb-5 font-mono text-fine font-medium tracking-[0.06em] text-bone-dim uppercase';
const NOTE = 'mt-4 text-fine text-bone-faint';

const Stat = ({ label, value }) => (
  // `col-span-full` on an orphaned last cell keeps the two-column mobile grid tidy
  <div
    data-stat
    className="flex flex-col justify-between gap-3 bg-ink-1/80 p-5 transition-colors duration-500 hover:bg-ink-2 max-md:[&:last-child:nth-child(odd)]:col-span-full"
  >
    <dt className="font-mono text-[0.72rem] tracking-[0.06em] text-bone-faint uppercase">{label}</dt>
    <dd className="font-display text-h2 leading-none">{value}</dd>
  </div>
);

const DailyBars = ({ days, label }) => {
  const max = Math.max(...days.map((d) => d.count), 1);
  const { lang } = useLang();
  const tickEvery = 7;
  const [tip, setTip] = useState(null);

  return (
    <figure className="relative">
      {/* A readout that follows the bar under the pointer. The SVG <title>s below keep the data for assistive tech. */}
      {tip != null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-sm border border-line-strong bg-ink-2 px-2.5 py-1.5 font-mono text-[0.72rem] whitespace-nowrap shadow-pop"
          style={{ left: `${((tip + 0.5) / DAYS) * 100}%` }}
          aria-hidden="true"
        >
          <b className="text-signal">{days[tip].count}</b> · {formatDate(days[tip].date, lang)}
        </div>
      )}
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
              // bars grow from the baseline when the chart scrolls into view (see Activity's GSAP setup)
              data-bar
              className={`origin-bottom [transform-box:fill-box] transition-[fill] duration-200 ${
                d.count === 0 ? 'fill-line-strong' : 'fill-signal hover:fill-bone'
              }`}
              onPointerEnter={() => setTip(i)}
              onPointerLeave={() => setTip(null)}
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

const CELL = 11;
const CELL_GAP = 3;
const LEVEL_FILL = ['fill-ink-3', 'fill-signal/25', 'fill-signal/50', 'fill-signal/75', 'fill-signal'];

/** The whole year as a week-by-week grid. The cells wave in from the left when it scrolls into view. */
const YearHeatmap = ({ days, label, caption }) => {
  const { cells, weeks } = useMemo(() => heatmapCells(days), [days]);
  const { lang } = useLang();
  if (!cells.length) return null;
  const step = CELL + CELL_GAP;
  return (
    <figure className="mt-9 overflow-hidden border-t border-line pt-6">
      <figcaption className="mb-4 font-mono text-[0.72rem] tracking-[0.06em] text-bone-faint uppercase">{caption}</figcaption>
      <svg viewBox={`0 0 ${weeks * step - CELL_GAP} ${7 * step - CELL_GAP}`} className="h-auto w-full" role="img" aria-label={label}>
        {cells.map((d) => (
          <rect
            key={d.date}
            data-cell
            data-col={d.col}
            x={d.col * step}
            y={d.row * step}
            width={CELL}
            height={CELL}
            rx="2"
            className={`transition-[fill] duration-200 hover:fill-bone ${LEVEL_FILL[d.level]}`}
          >
            <title>{`${formatDate(d.date, lang)}: ${d.count}`}</title>
          </rect>
        ))}
      </svg>
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

  // The numbers, bars and panels arrive when the board scrolls into view. The data loads after mount,
  // so the setup re-runs once it is there.
  const loaded = Boolean(data && derived);
  const scope = useGsap(({ scope: ref, mm }) => {
    if (!loaded) return;
    mm.add(MOTION, () => {
      const root = ref.current;
      const board = root.querySelector('[data-board]');
      gsap.from(root.querySelectorAll('[data-stat]'), {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: board, start: 'top 88%', once: true },
      });
      gsap.from(root.querySelectorAll('[data-panel]'), {
        y: 50,
        opacity: 0,
        clipPath: 'inset(0 0 100% 0)',
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.14,
        clearProps: 'clipPath',
        scrollTrigger: { trigger: root.querySelector('[data-panel]'), start: 'top 88%', once: true },
      });
      const cells = root.querySelectorAll('[data-cell]');
      if (cells.length) {
        // opacity only: scaling SVG cells made some mobile browsers briefly widen the page
        gsap.from(cells, {
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          // each cell waits for its week, so the year sweeps across from the left
          delay: (i) => Number(cells[i].dataset.col) * 0.018,
          scrollTrigger: { trigger: cells[0].closest('svg'), start: 'top 88%', once: true },
        });
      }
      const bars = root.querySelectorAll('[data-bar]');
      if (bars.length) {
        gsap.from(bars, {
          scaleY: 0,
          duration: 1.1,
          ease: 'elastic.out(1, 0.7)',
          stagger: { each: 0.025, from: 'start' },
          scrollTrigger: { trigger: bars[0].closest('svg'), start: 'top 85%', once: true },
        });
      }
      ScrollTrigger.create({
        trigger: root.querySelector('[data-lang-bar]'),
        start: 'top 90%',
        once: true,
        onEnter: () =>
          gsap.from(root.querySelectorAll('[data-lang-bar]'), { scaleX: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }),
      });
    });
  }, [loaded, lang]);

  return (
    <section id="activity" ref={scope} className="relative py-section" aria-labelledby="activity-title">
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
          <div className="grid gap-4" data-board>
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
                <section data-panel className={`${PANEL} lg:row-span-2`} aria-labelledby="chart-h">
                  <h3 id="chart-h" className={PANEL_TITLE}>
                    {c.activity.chart}
                  </h3>
                  <DailyBars days={derived.recent} label={c.activity.chartAlt(derived.recentTotal)} />
                  <p className={NOTE}>
                    {c.activity.active}: <strong className="font-medium text-bone">{derived.activeDays}</strong>
                  </p>
                  {data.contributions && (
                    <YearHeatmap
                      days={data.contributions}
                      caption={c.activity.heatmap}
                      label={c.activity.heatmapAlt(derived.yearTotal)}
                    />
                  )}
                </section>
              )}

              <section data-panel className={PANEL} aria-labelledby="lang-h">
                <h3 id="lang-h" className={PANEL_TITLE}>
                  {c.activity.languages}
                </h3>
                <ul className="grid gap-3">
                  {derived.languages.map(([name, n]) => (
                    <li key={name} className="grid grid-cols-[96px_1fr_24px] items-center gap-3 text-fine">
                      <span>{name}</span>
                      <span className="h-1.5 rounded-[1px] bg-ink-3">
                        <i
                          data-lang-bar
                          className="block h-full origin-left rounded-[1px] bg-bone"
                          style={{ width: `${(n / derived.languages[0][1]) * 100}%` }}
                        />
                      </span>
                      <span className="mono">{n}</span>
                    </li>
                  ))}
                </ul>
                <p className={NOTE}>{c.activity.langNote}</p>
              </section>

              <section data-panel className={PANEL} aria-labelledby="recent-h">
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
