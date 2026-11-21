import { useState } from 'react';
import { Check, Flame } from 'lucide-react';
import { Card, Eyebrow } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { stageOf } from '../habits/model';
import Plant from '../habits/Plant';
import { useArrived, useCountUp, useJustCompleted } from '../../core/motion/hooks';
import { Burst } from '../../core/motion/Pieces';
import { locale, tr } from '../../core/i18n/lang';
import { compact } from '../wallet/model';

/**
 * Habits as a windowsill: the habits are pots on the sill, and the sun climbs the sky behind the window as they are done
 * (set at dawn when none is, high when all are). Tapping a dry pot waters it (a can tips over it and drops fall), and a
 * watered pot glows with a tick; tapping it again takes the watering back.
 */
export function HabitsCard({ state, onTick, onTab, className, style }) {
  const { total, done, pending } = state;
  const all = state.all ?? pending.map((habit) => ({ habit, done: false }));
  const complete = total > 0 && pending.length === 0;
  const just = useJustCompleted(complete);
  const [watering, setWatering] = useState(null);
  const share = total > 0 ? done / total : 0;

  const water = (habit, isDone) => {
    if (watering) return;
    if (isDone) return onTick(habit);
    setWatering(habit.id);
    window.setTimeout(() => {
      onTick(habit);
      setWatering(null);
    }, 650);
  };

  return (
    <Card className={clsx('sill relative flex flex-col overflow-hidden p-0', className)} style={{ '--sun': share, ...style }}>
      {/* the sky through the window, the sun at its height, and the cross of the window frame */}
      <span className="sill-sky" aria-hidden="true">
        <i className="sill-sun" />
        <i className="sill-cloud" />
      </span>
      <span className="sill-frame" aria-hidden="true" />

      <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-5">
        <Eyebrow className="text-white/85!">{tr('HABITS')}</Eyebrow>
        <b className="numeral relative text-[2.6rem] leading-none text-white drop-shadow" aria-label={tr('{0} of {1} habits done. Tap to tick one.', done, total)}>
          {total > 0 ? (
            <>
              {done}
              <span className="text-[0.5em] text-white/70">/{total}</span>
            </>
          ) : (
            '–'
          )}
          {just && <Burst />}
        </b>
      </div>

      {total === 0 ? (
        <div className="relative z-10 mt-auto px-5 pb-5">
          <button type="button" onClick={() => onTab('habits')} className="sill-empty">
            {tr('Plant your first habit')}
          </button>
        </div>
      ) : (
        <div className="relative z-10 mt-auto">
          <ul className="sill-pots">
            {all.map(({ habit, done: isDone }) => {
              const { stage, wilting, streak } = stageOf(habit.days);
              return (
                <li key={habit.id}>
                  <button
                    type="button"
                    onClick={() => water(habit, isDone)}
                    aria-label={isDone ? tr('"{0}" is done today', habit.name) : tr('Mark "{0}" as done', habit.name)}
                    aria-pressed={isDone}
                    className="sill-pot"
                    data-done={isDone ? '' : undefined}
                    data-watering={watering === habit.id ? '' : undefined}
                  >
                    <span className="sill-can" aria-hidden="true">
                      <svg viewBox="0 0 32 22">
                        <rect x="6" y="6" width="14" height="12" rx="2" fill="currentColor" />
                        <path d="M20 9l10-5v3l-9 6z" fill="currentColor" />
                        <path d="M3 8c-2 2-2 6 3 7" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                      <i />
                      <i />
                      <i />
                    </span>
                    <Plant stage={stage} wilting={wilting && !isDone} hue={habit.hue ?? 140} className="sill-plant" />
                    {isDone && (
                      <span className="sill-done" aria-hidden="true">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                    <span className="sill-tag">
                      <span className="truncate">{habit.name}</span>
                      {streak > 1 && (
                        <b className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[0.58rem] font-medium text-signal">
                          <Flame size={9} aria-hidden="true" />
                          {streak}
                        </b>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <span className="sill-board" aria-hidden="true" />
        </div>
      )}
    </Card>
  );
}

const COINS = 16;
// where each coin settles in the jar (x, y in a 100 x 120 box, from the bottom up), spread so the pile looks heaped by hand
const PILE = Array.from({ length: COINS }, (_, i) => {
  const row = Math.floor(i / 4);
  const col = i % 4;
  return { x: 27 + col * 15 + (row % 2) * 7, y: 114 - row * 9 - (col % 2) * 2, turn: ((i * 37) % 40) - 20 };
});

/**
 * Money as a jar of coins: today's spending drops into the jar as coins (as many as it is against the bigger of the last
 * week's days), the amount stands beside it, and a row of small jars shows the last seven days, today's lit.
 */
export function MoneyCard({ spent, week, onTab, className, style }) {
  const arrived = useArrived();
  const shown = Math.round(useCountUp(spent.total));
  const before = week.slice(0, -1);
  const average = before.reduce((n, v) => n + v, 0) / Math.max(1, before.length);
  const compare = average > 0 && spent.total > 0 ? (spent.total > average ? 'above' : 'below') : null;
  const max = Math.max(1, ...week);
  const coins = spent.total > 0 ? Math.max(1, Math.round((spent.total / max) * COINS)) : 0;
  const total = week.reduce((n, v) => n + v, 0);
  const today = new Date();

  return (
    <Card as="button" type="button" onClick={() => onTab('wallet')} className={clsx('coin-card relative flex w-full flex-col gap-4 overflow-hidden text-left', className)} style={style}>
      <span className="flex items-center gap-4">
        <svg viewBox="0 0 100 130" className="coin-jar" aria-hidden="true" data-arrived={arrived ? '' : undefined}>
          <defs>
            <clipPath id="jar-inside">
              <path d="M22 28 Q14 34 14 48 V112 Q14 124 26 124 H74 Q86 124 86 112 V48 Q86 34 78 28 Z" />
            </clipPath>
          </defs>
          <rect x="24" y="8" width="52" height="14" rx="4" className="coin-lid" />
          <g clipPath="url(#jar-inside)">
            {PILE.slice(0, coins).map((c, i) => (
              <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.turn})`}>
                <g className="coin" style={{ '--i': i }}>
                  <ellipse rx="10.5" ry="4.8" />
                  <ellipse rx="6.5" ry="2.6" className="coin-face" />
                </g>
              </g>
            ))}
          </g>
          <path d="M22 22 V28 Q14 34 14 48 V112 Q14 124 26 124 H74 Q86 124 86 112 V48 Q86 34 78 28 V22 Z" className="coin-glass" />
          <path d="M24 50 V104" className="coin-shine" />
        </svg>
        <span className="min-w-0">
          <Eyebrow>{tr('SPENT TODAY')}</Eyebrow>
          <b className="numeral mt-1 flex items-baseline gap-1 text-[clamp(2.4rem,7vw,3.2rem)] text-bone" aria-label={`${spent.total} ₫`}>
            <span aria-hidden="true">{compact(shown)}</span>
            <span aria-hidden="true" className="text-[0.4em] text-bone-faint">₫</span>
          </b>
          <small className="mt-1 block font-mono text-[0.68rem] text-bone-faint">{spent.count ? tr('Spent today ({0} lines)', spent.count) : tr('The jar is empty today')}</small>
          {compare && (
            <span className="money-delta mt-1.5 inline-block" data-way={compare}>
              {compare === 'above' ? tr('Above your daily average') : tr('Below your daily average')}
            </span>
          )}
        </span>
      </span>

      <span className="block">
        <span className="flex items-end justify-between gap-1.5" aria-hidden="true">
          {week.map((v, i) => {
            const last = i === week.length - 1;
            const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (week.length - 1 - i));
            return (
              <span key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className={clsx('mini-jar', last && 'mini-jar-today')}>
                  <i style={{ height: arrived ? `${v ? Math.max(12, (v / max) * 100) : 0}%` : '0%', transitionDelay: `${i * 70}ms` }} />
                </span>
                <small className={clsx('font-mono text-[0.54rem] uppercase', last ? 'font-semibold text-signal' : 'text-bone-faint')}>{day.toLocaleDateString(locale(), { weekday: 'short' }).slice(0, 3)}</small>
              </span>
            );
          })}
        </span>
        <small className="mt-2 flex items-center justify-between font-mono text-[0.66rem] text-bone-faint">
          <span>{tr('The last 7 days')}</span>
          {total > 0 && <b className="font-medium text-bone-dim">{compact(total)} ₫</b>}
        </small>
      </span>
    </Card>
  );
}
