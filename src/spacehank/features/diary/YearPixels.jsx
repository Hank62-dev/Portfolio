import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { habits as habitStore } from '../habits/store';
import { MOOD_COLORS } from './MoodFace';
import { moodWord } from './model';
import { monthStarts, yearCells } from './pixels';

const colourOf = (cell, by) => {
  if (cell.future) return undefined;
  if (by === 'mood') return cell.written ? (cell.mood ? MOOD_COLORS[cell.mood - 1] : 'var(--dz-text)') : undefined;
  if (cell.habits == null || cell.habits === 0) return undefined;
  return `hsl(140 55% ${68 - cell.habits * 32}%)`;
};

/**
 * The year as pixels: 365 small squares, one a day in columns of weeks, coloured by the diary's mood or by the habits kept.
 * A square opens its day (or offers to write it, for a past day with no page).
 */
export default function YearPixels({ notes, todayKey, onOpen, onWrite }) {
  const [year, setYear] = useState(() => Number(todayKey.slice(0, 4)));
  const [by, setBy] = useState('mood');
  const habitList = useStore(habitStore.store, (s) => s.items);
  useEffect(() => {
    void habitStore.load();
  }, []);
  const cells = useMemo(() => yearCells({ year, notes, habits: habitList, today: todayKey }), [year, notes, habitList, todayKey]);
  const months = useMemo(() => monthStarts(cells), [cells]);
  const weeks = cells[cells.length - 1].week + 1;
  const written = cells.filter((c) => c.written).length;
  const thisYear = Number(todayKey.slice(0, 4));

  return (
    <section aria-label={tr('The year in pixels')} className="year-pixels">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="font-display text-[1.5rem] leading-none text-[color:var(--dz-text)]">{tr('The year in pixels')}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear((y) => y - 1)} aria-label={tr('The year before')} className="yp-btn">
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <b className="min-w-[3.2rem] text-center font-mono text-[0.8rem] text-[color:var(--dz-text)]">{year}</b>
          <button type="button" onClick={() => setYear((y) => Math.min(thisYear, y + 1))} disabled={year >= thisYear} aria-label={tr('The year after')} className="yp-btn">
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-1 px-1" role="radiogroup" aria-label={tr('Colour the days by')}>
        {[
          ['mood', tr('Mood')],
          ['habits', tr('Habits')],
        ].map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={by === id} onClick={() => setBy(id)} className={clsx('yp-tab', by === id && 'is-on')}>
            {label}
          </button>
        ))}
        <small className="ml-auto font-mono text-[0.66rem] text-[color:var(--dz-text)]/70">{tr('{0} pages this year', written)}</small>
      </div>

      <div className="yp-scroll">
        <div className="yp-grid" style={{ '--weeks': weeks }}>
          {months.map((m) => (
            <span key={m.month} className="yp-month" style={{ gridColumn: m.week + 1 }}>
              {new Date(year, m.month, 1).toLocaleDateString(locale(), { month: 'short' })}
            </span>
          ))}
          {cells.map((cell) => {
            const colour = colourOf(cell, by);
            const label = `${cell.day}${cell.written ? ` · ${moodWord(cell.mood) || tr('written')}` : ''}${cell.habits != null ? ` · ${tr('{0}% habits', Math.round(cell.habits * 100))}` : ''}`;
            return (
              <button
                key={cell.day}
                type="button"
                disabled={cell.future}
                onClick={() => (cell.written ? onOpen(cell.day) : onWrite(cell.day))}
                title={label}
                aria-label={label}
                className={clsx('yp-cell', cell.day === todayKey && 'is-today')}
                style={{ gridColumn: cell.week + 1, gridRow: cell.weekday + 2, background: colour }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 px-1 font-mono text-[0.6rem] text-[color:var(--dz-text)]/70" aria-hidden="true">
        {by === 'mood' ? (
          <>
            {MOOD_COLORS.map((c, i) => (
              <i key={c} className="yp-key" style={{ background: c }} title={moodWord(i + 1)} />
            ))}
            <span>{tr('sad → happy')}</span>
          </>
        ) : (
          <>
            {[0.25, 0.5, 0.75, 1].map((v) => (
              <i key={v} className="yp-key" style={{ background: `hsl(140 55% ${68 - v * 32}%)` }} />
            ))}
            <span>{tr('fewer → all habits')}</span>
          </>
        )}
      </div>
    </section>
  );
}
