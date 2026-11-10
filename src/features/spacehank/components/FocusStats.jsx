import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { focusLog } from '../focus/log';
import { hoursMinutes, summarize } from '../focus/stats';
import { useStore } from '../store';
import { Figure, Tile } from './Page';
import { tr } from '../lang';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const BAR = 88; // the tallest bar, in px

/** How long you have focused: today, the streak of days in a row, and the last seven days as bars. */
export default function FocusStats() {
  const { log } = useStore(focusLog);
  const stats = useMemo(() => summarize(log), [log]);
  const top = Math.max(60, ...stats.week.map((d) => d.minutes)); // a short week still looks like a short week
  const summary = tr('Last seven days: {0} of focus. Today {1}. {2} day streak.', hoursMinutes(stats.weekMinutes), hoursMinutes(stats.today.minutes), stats.streak);

  return (
    <Tile title={tr('Your focus')} aside={<span className="font-mono text-[0.68rem] text-bone-faint">{hoursMinutes(stats.totalMinutes)} {tr('in all')}</span>} data-focus-stats>
      <div className="grid grid-cols-3 gap-2">
        <Figure value={hoursMinutes(stats.today.minutes)} label={tr('Today')} tone="text-signal" />
        <Figure
          value={
            <span className="inline-flex items-center gap-1.5">
              <Flame size={18} className={stats.streak ? 'text-signal' : 'text-bone-faint'} aria-hidden="true" />
              {stats.streak}
            </span>
          }
          label={tr('Streak')}
        />
        <Figure value={stats.best} label={tr('Best')} />
      </div>
      <figure className="mt-4" aria-label={summary}>
        <ol className="flex h-[7.5rem] items-end justify-between gap-2" aria-hidden="true">
          {stats.week.map((d, i) => {
            const isToday = i === stats.week.length - 1;
            return (
              <li key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1.5" title={`${d.day}: ${hoursMinutes(d.minutes)}`}>
                <span className="font-mono text-[0.6rem] text-bone-faint tabular-nums">{d.minutes ? d.minutes : ''}</span>
                <i
                  className={clsx('block w-full max-w-9 rounded-full transition-[height] duration-500', d.minutes ? (isToday ? 'bg-signal' : 'bg-bone/70') : 'bg-line')}
                  style={{ height: d.minutes ? Math.max(8, (d.minutes / top) * BAR) : 4 }}
                />
                <span className={clsx('font-mono text-[0.66rem]', isToday ? 'text-signal' : 'text-bone-faint')}>{WEEKDAYS[d.weekday]}</span>
              </li>
            );
          })}
        </ol>
        <figcaption className="mt-2 font-mono text-[0.68rem] text-bone-faint">
          {tr('Last 7 days ·')} {hoursMinutes(stats.weekMinutes)} {tr('· only sessions that ran to the end count')}
        </figcaption>
      </figure>
    </Tile>
  );
}
