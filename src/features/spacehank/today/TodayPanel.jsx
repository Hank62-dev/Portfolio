import { ArrowUpRight, Sparkles } from 'lucide-react';
import { dayKey, toggleDay } from '../habits/model';
import { habits } from '../habits/store';
import { moveCard } from '../missions/model';
import { missions } from '../missions/store';
import { tr } from '../lang';
import DayCard from './DayCard';
import DoNowCard from './DoNowCard';
import InboxCard from './InboxCard';
import ReviewCard from './ReviewCard';
import { HabitsCard, MoneyCard } from './SmallCards';
import { useLifeData } from './useLifeData';
import { buildToday, spendLast7 } from './model';

// each block of the screen arrives a little after the one before
const at = (i) => ({ '--i': i });

/**
 * What needs you now, under the sky: Hank's one or two nudges, then the
 * feature card (how many things need you) beside the habits and the money, the Inbox to sort, the day and the week.
 */
export default function TodayPanel({ onTab, onNotify }) {
  const data = useLifeData();
  const today = buildToday(data);
  const { tasks, deadlines, habits: habitState, spent, nudges } = today;
  const week = spendLast7(data.entries);
  const key = dayKey();

  const finish = (task) => {
    const changed = moveCard(missions.store.get().items, task.id, 'done', 0);
    void missions.putMany(changed);
    onNotify?.(tr('Marked as done'));
  };
  const tick = (habit) => void habits.update(habit.id, { days: toggleDay(habit.days, key) });
  const step = nudges.length;

  return (
    <section aria-label={tr('Today')} className="flex flex-col gap-4" data-today>
      {nudges.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={tr('Hank suggests')}>
          {nudges.map((nudge, i) => (
            <li key={nudge.id} className="rise flex items-center gap-3 rounded-2xl border border-line bg-ink-1 px-4 py-3" style={at(1 + i)}>
              <Sparkles size={15} className="shrink-0 text-signal" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-fine text-bone">{nudge.text}</span>
              {nudge.tab && (
                <button type="button" onClick={() => onTab(nudge.tab)} aria-label={tr('Open')} className="grid size-8 shrink-0 place-items-center rounded-full text-bone-dim transition-colors hover:text-bone active:scale-90">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* a bento: the feature card is the tall one, with habits and money beside it (one under the other on a phone) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <DoNowCard tasks={tasks} deadlines={deadlines} onFinish={finish} onTab={onTab} className="rise col-span-2 md:col-span-4 md:row-span-2" style={at(step + 1)} />
        <HabitsCard state={habitState} onTick={tick} onTab={onTab} className="rise col-span-2 md:col-span-2" style={at(step + 2)} />
        <MoneyCard spent={spent} week={week} onTab={onTab} className="rise col-span-2 md:col-span-2" style={at(step + 3)} />
      </div>

      <div className="rise" style={at(step + 4)}>
        <InboxCard items={data.inbox} onNotify={onNotify} />
      </div>
      <div className="rise" style={at(step + 5)}>
        <DayCard data={data} onTab={onTab} />
      </div>
      <div className="rise" style={at(step + 6)}>
        <ReviewCard data={data} onNotify={onNotify} />
      </div>
    </section>
  );
}
