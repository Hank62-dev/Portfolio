import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Medal } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { content } from './store';
import { BADGES, heatmap, monthGrid, streakOf } from './studio';
import { PLATFORM_HUE, Panel, STAGE_HUE } from './ui';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0].map((d) => new Date(2026, 10, 15 + d).toLocaleDateString(locale(), { weekday: 'narrow' }));
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The streak as a flame that burns brighter the longer it runs, with the badges earned on the way. */
function Streak({ streak }) {
  const heat = Math.min(1, streak.current / 30);
  const next = BADGES.find((b) => b.days > streak.current);
  return (
    <section className="cl-hero cl-rise flex flex-col gap-5 rounded-[2rem] border border-line p-5 md:flex-row md:items-center md:p-7" aria-label={tr('Posting streak')} data-streak>
      <div className="flex items-center gap-4">
        <span className={clsx('cl-flame', streak.current === 0 && 'is-out')} style={{ '--heat': heat }} aria-hidden="true">
          <Flame size={42} strokeWidth={1.4} />
        </span>
        <span>
          <b className="block font-display text-[3.2rem] leading-none tabular-nums text-bone">{streak.current}</b>
          <small className="font-mono text-[0.7rem] tracking-[0.12em] text-bone-faint uppercase">{streak.current === 1 ? tr('day in a row') : tr('days in a row')}</small>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-fine text-bone-dim">
          {streak.current === 0 ? tr('Post something today to light it.') : streak.today ? tr('Today is done. See you tomorrow.') : tr('Post today to keep it going.')} {tr('Best: {0}.', streak.best)}
        </p>
        {next && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-wash/10" role="progressbar" aria-valuemin={0} aria-valuemax={next.days} aria-valuenow={streak.current} aria-label={next.label}>
              <i className="block h-full rounded-full bg-[linear-gradient(90deg,#f0a35a,#ffd27a)] transition-[width] duration-700" style={{ width: `${(streak.current / next.days) * 100}%` }} />
            </div>
            <small className="mt-1 block font-mono text-[0.68rem] text-bone-faint">{tr('{0} more for “{1}”', next.days - streak.current, next.label)}</small>
          </div>
        )}
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={tr('Badges')}>
          {BADGES.map((b) => {
            const got = streak.best >= b.days;
            return (
              <li key={b.days} className={clsx('cl-badge', got && 'is-got')} title={b.label}>
                <Medal size={12} aria-hidden="true" /> {b.days} · {b.label}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * The content calendar: the posting streak with its badges, half a year of posting days as a heatmap, and the month laid out
 * with what is scheduled (by stage) and what went out.
 */
export default function CalendarPanel({ onOpen }) {
  const { items } = useStore(content.store);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  useEffect(() => {
    void content.load();
  }, []);

  const streak = useMemo(() => streakOf(items), [items]);
  const weeks = useMemo(() => heatmap(items, Date.now(), 26), [items]);
  const month = useMemo(() => monthGrid(cursor.y, cursor.m, items), [cursor, items]);
  const today = todayKey();
  const shift = (by) => setCursor(({ y, m }) => ({ y: m + by < 0 ? y - 1 : m + by > 11 ? y + 1 : y, m: (m + by + 12) % 12 }));
  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4" data-calendar>
      <Streak streak={streak} />

      <Panel title={tr('Half a year of posting')} icon={Flame} hue={28}>
        <div className="no-scrollbar overflow-x-auto">
          <div className="cl-heat" role="img" aria-label={tr('{0} days with a post in the last six months', weeks.flat().filter((c) => c.n).length)}>
            {weeks.map((week, w) => (
              <span key={w} className="flex flex-col gap-[3px]">
                {week.map((c) => (
                  <i key={c.key} className="cl-heat-cell" data-n={Math.min(3, c.n)} data-future={c.future || undefined} title={`${c.key}: ${c.n}`} />
                ))}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title={title}
        aside={
          <span className="flex gap-1">
            <button type="button" onClick={() => shift(-1)} className="rounded-full p-1.5 text-bone-dim hover:bg-wash/[0.06] hover:text-bone" aria-label={tr('Previous month')}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => shift(1)} className="rounded-full p-1.5 text-bone-dim hover:bg-wash/[0.06] hover:text-bone" aria-label={tr('Next month')}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </span>
        }
      >
        <div className="grid grid-cols-7 gap-1 font-mono text-[0.64rem] text-bone-faint uppercase">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="px-1.5">
              {d}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" data-month>
          {month.flat().map((c) => (
            <div key={c.key} className={clsx('cl-day', !c.inMonth && 'is-out', c.key === today && 'is-today')}>
              <span className="cl-day-no">{c.date}</span>
              <span className="flex flex-col gap-0.5">
                {c.pieces.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onOpen?.(p.id)}
                    className={clsx('cl-day-piece', p.stage === 'posted' && 'is-posted')}
                    style={{ '--hue': p.stage === 'posted' ? STAGE_HUE.posted : (PLATFORM_HUE[p.platforms?.[0]] ?? STAGE_HUE[p.stage] ?? 220) }}
                    title={p.title}
                  >
                    {p.title}
                  </button>
                ))}
                {c.pieces.length > 3 && <small className="px-1 font-mono text-[0.6rem] text-bone-faint">+{c.pieces.length - 3}</small>}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
