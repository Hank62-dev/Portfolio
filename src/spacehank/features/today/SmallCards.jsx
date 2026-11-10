import { Flame, Sprout } from 'lucide-react';
import { Card, Eyebrow } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { stageOf } from '../habits/model';
import Plant from '../habits/Plant';
import { useArrived, useCountUp, useJustCompleted } from '../../core/motion/hooks';
import { Burst, ProgressRing } from '../../core/motion/Pieces';
import { locale, tr } from '../../core/i18n/lang';
import { compact } from '../wallet/model';

/** Habits: a ring with how many are done, and the ones still waiting as the plants they have grown into (one tap waters one). */
export function HabitsCard({ state, onTick, onTab, className, style }) {
  const { total, done, pending } = state;
  const complete = total > 0 && pending.length === 0;
  const just = useJustCompleted(complete);
  return (
    <Card className={clsx('tint-card relative flex flex-col gap-4 overflow-hidden', className)} style={{ '--card-hue': 132, ...style }}>
      <span className="card-glow" aria-hidden="true" />
      <div className="relative flex items-center gap-4">
        {total > 0 ? (
          <span className="relative shrink-0">
            <ProgressRing value={done / total} size={84} stroke={6} label={tr('{0} of {1} habits done. Tap to tick one.', done, total)}>
              <Sprout size={24} className={complete ? 'text-signal' : 'text-bone-dim'} aria-hidden="true" />
            </ProgressRing>
            {just && <Burst />}
          </span>
        ) : null}
        <div className="min-w-0">
          <Eyebrow>{tr('HABITS')}</Eyebrow>
          <b className="numeral numeral-tint mt-1 block text-[clamp(2.6rem,9vw,3.6rem)]" aria-hidden="true">
            {total > 0 ? (
              <>
                {done}
                <span className="text-[0.5em] text-bone-faint">/{total}</span>
              </>
            ) : (
              '–'
            )}
          </b>
        </div>
      </div>
      {total === 0 ? (
        <button type="button" onClick={() => onTab('habits')} className="relative self-start text-fine text-bone-dim underline underline-offset-4">
          {tr('Plant your first habit')}
        </button>
      ) : complete ? (
        <p className="relative text-fine text-bone-dim">{tr('Every habit is done today.')}</p>
      ) : (
        <div className="relative flex flex-wrap gap-2">
          {pending.map((habit) => {
            const { stage, wilting, streak } = stageOf(habit.days);
            return (
              <button key={habit.id} type="button" onClick={() => onTick(habit)} aria-label={tr('Mark "{0}" as done', habit.name)} className="habit-chip">
                <Plant stage={stage} wilting={wilting} hue={habit.hue ?? 140} className="size-7 shrink-0" />
                <span className="min-w-0 truncate">{habit.name}</span>
                {streak > 1 && (
                  <b className="inline-flex items-center gap-0.5 font-mono text-[0.62rem] font-medium text-signal">
                    <Flame size={10} aria-hidden="true" />
                    {streak}
                  </b>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Seven bars, one per day with its name under it, the last one today and lit: they grow up from the floor when the card appears. */
function Spark({ values }) {
  const arrived = useArrived();
  const max = Math.max(1, ...values);
  const today = new Date();
  return (
    <span className="flex items-end gap-1.5" aria-hidden="true">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (values.length - 1 - i));
        return (
          <span key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="flex h-12 w-full items-end">
              <i
                className={clsx('spark-bar block w-full', last && 'spark-today')}
                style={{ height: arrived ? `${v ? Math.max(14, (v / max) * 100) : 6}%` : '0%', transition: 'height 0.8s var(--ease-out-expo)', transitionDelay: `${i * 60}ms` }}
              />
            </span>
            <small className={clsx('font-mono text-[0.54rem] uppercase', last ? 'text-bone' : 'text-bone-faint')}>{day.toLocaleDateString(locale(), { weekday: 'short' }).slice(0, 3)}</small>
          </span>
        );
      })}
    </span>
  );
}

/** Money: what was spent today as a big number, how it compares with the other days, and the last seven days as bars. */
export function MoneyCard({ spent, week, onTab, className, style }) {
  const shown = Math.round(useCountUp(spent.total));
  const before = week.slice(0, -1);
  const average = before.reduce((n, v) => n + v, 0) / Math.max(1, before.length);
  const compare = average > 0 && spent.total > 0 ? (spent.total > average ? 'above' : 'below') : null;
  const total = week.reduce((n, v) => n + v, 0);
  return (
    <Card as="button" type="button" onClick={() => onTab('wallet')} className={clsx('tint-card relative flex w-full flex-col gap-4 overflow-hidden text-left', className)} style={{ '--card-hue': 84, ...style }}>
      <span className="card-glow" aria-hidden="true" />
      <span className="relative block">
        <Eyebrow>{tr('SPENT TODAY')}</Eyebrow>
        <b className="numeral numeral-tint mt-1 flex items-baseline gap-1 text-[clamp(2.6rem,9vw,3.6rem)]" aria-label={`${spent.total} ₫`}>
          <span aria-hidden="true">{compact(shown)}</span>
          <span aria-hidden="true" className="text-[0.4em] text-bone-faint">₫</span>
        </b>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <small className="font-mono text-[0.7rem] text-bone-faint">{spent.count ? tr('Spent today ({0} lines)', spent.count) : tr('Nothing spent yet today')}</small>
          {compare && (
            <span className="money-delta" data-way={compare}>
              {compare === 'above' ? tr('Above your daily average') : tr('Below your daily average')}
            </span>
          )}
        </span>
      </span>
      <span className="relative block">
        <Spark values={week} />
        <small className="mt-2 flex items-center justify-between font-mono text-[0.66rem] text-bone-faint">
          <span>{tr('The last 7 days')}</span>
          {total > 0 && <b className="font-medium text-bone-dim">{compact(total)} ₫</b>}
        </small>
      </span>
    </Card>
  );
}
