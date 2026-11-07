import { Sprout } from 'lucide-react';
import { Card, Eyebrow } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useArrived, useCountUp, useJustCompleted } from '../motion/hooks';
import { Burst, ProgressRing } from '../motion/Pieces';
import { tr } from '../lang';
import { compact } from '../wallet/model';

/** Habits: a ring with how many are done, and the ones still waiting (one tap ticks a habit). */
export function HabitsCard({ state, onTick, onTab, className, style }) {
  const { total, done, pending } = state;
  const complete = total > 0 && pending.length === 0;
  const just = useJustCompleted(complete);
  return (
    <Card className={clsx('tint-card flex flex-col gap-4', className)} style={{ '--card-hue': 132, ...style }}>
      <div className="flex items-center gap-4">
        {total > 0 ? (
          <span className="relative shrink-0">
            <ProgressRing value={done / total} size={76} stroke={5} label={tr('{0} of {1} habits done. Tap to tick one.', done, total)}>
              <Sprout size={22} className={complete ? 'text-signal' : 'text-bone-dim'} aria-hidden="true" />
            </ProgressRing>
            {just && <Burst />}
          </span>
        ) : null}
        <div className="min-w-0">
          <Eyebrow>{tr('HABITS')}</Eyebrow>
          <b className="numeral mt-1 block text-[clamp(2.4rem,9vw,3.4rem)] text-bone" aria-hidden="true">
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
        <button type="button" onClick={() => onTab('habits')} className="self-start text-fine text-bone-dim underline underline-offset-4">
          {tr('Plant your first habit')}
        </button>
      ) : complete ? (
        <p className="text-fine text-bone-dim">{tr('Every habit is done today.')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {pending.map((habit) => (
            <button key={habit.id} type="button" onClick={() => onTick(habit)} aria-label={tr('Mark "{0}" as done', habit.name)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-ink-1/60 px-3 text-fine text-bone-dim transition-[color,border-color,transform] duration-300 hover:border-signal hover:text-bone active:scale-95">
              <Sprout size={13} aria-hidden="true" /> {habit.name}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Seven small bars, one per day, the last one today: they grow up from the floor when the card appears. */
function Spark({ values }) {
  const arrived = useArrived();
  const max = Math.max(1, ...values);
  return (
    <span className="flex h-12 items-end gap-1.5" aria-hidden="true">
      {values.map((v, i) => (
        <i
          key={i}
          className={clsx('block flex-1 rounded-full', i === values.length - 1 ? 'bg-signal' : 'bg-bone/25')}
          style={{ height: arrived ? `${v ? Math.max(14, (v / max) * 100) : 6}%` : '0%', transition: 'height 0.8s var(--ease-out-expo)', transitionDelay: `${i * 60}ms` }}
        />
      ))}
    </span>
  );
}

/** Money: what was spent today as a big number, and the last seven days as small bars. */
export function MoneyCard({ spent, week, onTab, className, style }) {
  const shown = Math.round(useCountUp(spent.total));
  return (
    <Card as="button" type="button" onClick={() => onTab('wallet')} className={clsx('tint-card flex w-full flex-col gap-4 text-left', className)} style={{ '--card-hue': 84, ...style }}>
      <span className="block">
        <Eyebrow>{tr('SPENT TODAY')}</Eyebrow>
        <b className="numeral mt-1 flex items-baseline gap-1 text-[clamp(2.4rem,9vw,3.4rem)] text-bone" aria-label={`${spent.total} ₫`}>
          <span aria-hidden="true">{compact(shown)}</span>
          <span aria-hidden="true" className="text-[0.4em] text-bone-faint">₫</span>
        </b>
        <small className="font-mono text-[0.7rem] text-bone-faint">{spent.count ? tr('Spent today ({0} lines)', spent.count) : tr('Nothing spent yet today')}</small>
      </span>
      <span className="block">
        <Spark values={week} />
        <small className="mt-1.5 block font-mono text-[0.66rem] text-bone-faint">{tr('The last 7 days')}</small>
      </span>
    </Card>
  );
}
