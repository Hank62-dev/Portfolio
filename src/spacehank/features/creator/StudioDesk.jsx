import { ArrowRight, ArrowDownRight, ArrowUpRight, CalendarHeart, Clapperboard, Coins, FileWarning, Handshake, Lightbulb, Mail, ShoppingBag, Target } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { locale, tr } from '../../core/i18n/lang';
import { sourceLabel, vnd, vndShort } from './model';
import { Ring } from './ui';

const MOVE_ICON = { invoice: FileWarning, lead: Mail, deal: Handshake, post: Clapperboard, shop: ShoppingBag, idea: Lightbulb };

/** The month as a till roll: the latest money printed line by line, a dotted rule, and the total at the foot. */
function Tape({ entries, total, change }) {
  const Arrow = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;
  const month = new Date().toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  return (
    <div className="cl-tape" data-tape>
      <div className="cl-tape-paper">
        <p className="cl-tape-head">
          <b>HANK62 · CREATOR LAB</b>
          <span>{month}</span>
        </p>
        {entries.length === 0 ? (
          <p className="cl-tape-empty">{tr('Nothing on the roll yet. The first payment prints here.')}</p>
        ) : (
          <ul>
            {entries.map((e, i) => (
              <li key={e.id} style={{ '--i': i }}>
                <span className="truncate">{e.note || sourceLabel(e.source)}</span>
                <b>{vndShort(e.amount)}</b>
              </li>
            ))}
          </ul>
        )}
        <p className="cl-tape-total">
          <span>{tr('TOTAL')}</span>
          <b data-month-total>{vnd(total)}</b>
        </p>
        {change !== null && (
          <p className={clsx('cl-tape-change', change < 0 && 'is-down')}>
            <Arrow size={11} aria-hidden="true" /> {Math.abs(change)}
            {tr('% vs last month')}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The top of the Creator Lab: the month printed as a till roll beside the goal ring, and the one move most likely to bring money
 * in today, with what else waits (posts, follow-ups, sales) and the week's report.
 */
export default function StudioDesk({ entries, total, previous, goal, g, move, counts, onGo, onGoal, onReport }) {
  const change = previous ? Math.round(((total - previous) / previous) * 100) : null;
  const MoveIcon = MOVE_ICON[move.kind] ?? Lightbulb;
  return (
    <section className="cl-desk cl-rise grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" aria-label={tr('This month')}>
      <div className="cl-hero relative flex items-center gap-5 overflow-hidden rounded-[2rem] border border-line p-5 md:p-6">
        <Tape entries={entries} total={total} change={change} />
        <div className="flex shrink-0 flex-col items-center gap-3 max-sm:hidden">
          <Ring pct={g.pct} size={128} stroke={9} done={g.reached}>
            {goal > 0 ? (
              <span className="leading-none">
                <b className="block font-display text-[2rem] tabular-nums text-bone">{g.pct}%</b>
                <small className="mt-1 block font-mono text-[0.6rem] tracking-[0.14em] text-bone-faint uppercase">{g.reached ? tr('reached') : tr('of goal')}</small>
              </span>
            ) : (
              <Target size={26} strokeWidth={1.4} className="text-bone-faint" aria-hidden="true" />
            )}
          </Ring>
          <button type="button" onClick={onGoal} className="rounded-full border border-line-strong px-3 py-1 font-mono text-[0.68rem] text-bone-dim hover:border-bone hover:text-bone">
            {goal > 0 ? tr('Adjust the goal') : tr('Set a goal')}
          </button>
          {goal > 0 && !g.reached && <small className="max-w-[9rem] text-center font-mono text-[0.64rem] text-bone-faint">{tr('{0} a day to get there', vndShort(g.neededPerDay))}</small>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => onGo(move.section, move.id)} className={clsx('cl-move group', `is-${move.kind}`)} data-money-move={move.kind}>
          <span className="cl-move-kicker">
            <MoveIcon size={14} aria-hidden="true" /> {tr('The one move today')}
          </span>
          <b className="cl-move-title">{move.title}</b>
          <span className="cl-move-foot">
            <span>{move.detail}</span>
            {move.value > 0 && <em>{vndShort(move.value)}</em>}
            <ArrowRight size={16} className="ml-auto transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
        <div className="grid grid-cols-4 gap-2">
          {[
            ['pipeline', Clapperboard, counts.post, tr('To post'), counts.post > 0],
            ['deals', Handshake, counts.follow, tr('Follow up'), counts.follow > 0],
            ['store', Coins, vndShort(counts.soldToday), tr('Sold today'), false],
            [null, CalendarHeart, '', tr('Week'), false],
          ].map(([to, Icon, value, label, hot], i) => (
            <button key={label} type="button" onClick={() => (to ? onGo(to) : onReport())} style={{ animationDelay: `${120 + i * 60}ms` }} className={clsx('cl-card cl-rise flex min-w-0 flex-col items-start gap-1.5 rounded-[1.2rem] border p-3 text-left', hot ? 'border-warn/45' : 'border-line')}>
              <Icon size={15} className={hot ? 'text-warn' : 'text-bone-faint'} aria-hidden="true" />
              {value !== '' && <b className={clsx('font-display text-[1.35rem] leading-none tabular-nums', hot ? 'text-warn' : 'text-bone')}>{value}</b>}
              <small className="truncate font-mono text-[0.64rem] text-bone-dim">{label}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
