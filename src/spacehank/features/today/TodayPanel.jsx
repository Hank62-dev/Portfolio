import { ArrowUpRight, Newspaper, Sparkles } from 'lucide-react';
import { dayKey, toggleDay } from '../habits/model';
import { habits } from '../habits/store';
import { moveCard, newCard } from '../missions/model';
import { missions } from '../missions/store';
import { tr } from '../../core/i18n/lang';
import { clsx } from '../../../shared/lib/format';
import { sound } from '../../core/sound';
import { undoToast } from '../../../shared/ui';
import DayCard from './DayCard';
import DoNowCard from './DoNowCard';
import InboxCard from './InboxCard';
import ReviewCard from './ReviewCard';
import UpcomingCard from './UpcomingCard';
import { HabitsCard, MoneyCard } from './SmallCards';
import { useLifeData } from './useLifeData';
import { buildToday, spendLast7 } from './model';
import { partOfDay } from './paper';
import { openPaper } from './DayPaper';

// each block of the screen arrives a little after the one before
const at = (i) => ({ '--i': i });

// What leads at each part of the day: in the morning the work and the habits; at midday the money comes up beside the work; in
// the evening the look back (the day's paper, the day, the week) comes first and the board after it.
const ORDER = {
  morning: { bento: 1, upcoming: 2, inbox: 3, day: 4, review: 5, paper: 9 },
  midday: { bento: 1, upcoming: 2, inbox: 3, day: 4, review: 5, paper: 9 },
  evening: { paper: 1, day: 2, bento: 3, review: 4, upcoming: 5, inbox: 6 },
};
const PART_LABEL = { morning: () => tr('Morning · start the day'), midday: () => tr('Midday · keep it moving'), evening: () => tr('Evening · look back on the day') };

/**
 * What needs you now, under the sky: Hank's one or two nudges, then the feature card (how many things need you) beside the
 * habits and the money, the Inbox to sort, the day and the week, in an order that follows the time of day.
 */
export default function TodayPanel({ onTab, onNotify }) {
  const data = useLifeData();
  const today = buildToday(data);
  const { tasks, deadlines, doneToday, habits: habitState, spent, nudges } = today;
  const week = spendLast7(data.entries);
  const key = dayKey();

  // every change made from the board can be taken back from the message that confirms it
  const restore = (cards) => () => void missions.putMany(cards);
  const finish = (task) => {
    const items = missions.store.get().items;
    const changed = moveCard(items, task.id, 'done', 0);
    const before = items.filter((c) => changed.some((x) => x.id === c.id));
    void missions.putMany(changed);
    undoToast(tr('Marked as done'), restore(before));
  };
  const rename = (task, title) => void missions.update(task.id, { title });
  const drop = (task, zone) => {
    const card = missions.store.get().items.find((c) => c.id === task.id);
    if (!card) return;
    if (zone === 'bin') {
      sound.tear();
      void missions.remove(card.id);
      undoToast(tr('"{0}" thrown away', card.title), () => void missions.put(card));
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      void missions.update(card.id, { due: dayKey(tomorrow) });
      undoToast(tr('"{0}" moved to tomorrow', card.title), () => void missions.update(card.id, { due: card.due }));
    }
  };
  const create = async (title) => {
    const cards = missions.store.get().items;
    await missions.create({ ...newCard(title, 'backlog', cards.filter((c) => c.column === 'backlog').length), due: key });
  };
  const tick = (habit) => {
    const was = habit.days;
    const watering = !was.includes(key);
    void habits.update(habit.id, { days: toggleDay(was, key) });
    if (watering) {
      sound.water();
      undoToast(tr('"{0}" watered', habit.name), () => void habits.update(habit.id, { days: was }));
    }
  };
  const step = nudges.length;
  const part = partOfDay();
  const order = ORDER[part];

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

      <p className="rise order-0 -mb-1 font-mono text-[0.66rem] tracking-[0.16em] text-bone-faint uppercase" style={at(step)} data-part={part}>
        {PART_LABEL[part]()}
      </p>

      {part === 'evening' && (
        <button type="button" onClick={openPaper} className="paper-invite rise" style={{ ...at(step + 1), order: order.paper }}>
          <Newspaper size={26} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <b className="block font-display text-[1.25rem] leading-tight font-semibold">{tr('Today’s paper is out')}</b>
            <small className="block font-mono text-[0.68rem] opacity-70">{tr('The day as a front page: what got done, the garden, the ledger')}</small>
          </span>
          <ArrowUpRight size={18} aria-hidden="true" className="shrink-0" />
        </button>
      )}

      {/* a bento: the feature card is the tall one, with habits and money beside it (one under the other on a phone); at midday the money comes first */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6" style={{ order: order.bento }}>
        <DoNowCard tasks={tasks} deadlines={deadlines} doneToday={doneToday} onFinish={finish} onRename={rename} onDrop={drop} onCreate={create} onTab={onTab} className="rise col-span-2 md:col-span-4 md:row-span-2" style={at(step + 1)} />
        <HabitsCard state={habitState} onTick={tick} onTab={onTab} className={clsx('rise col-span-2 md:col-span-2', part === 'midday' && 'md:order-2')} style={at(step + 2)} />
        <MoneyCard spent={spent} week={week} onTab={onTab} className={clsx('rise col-span-2 md:col-span-2', part === 'midday' && 'md:order-1')} style={at(step + 3)} />
      </div>

      <UpcomingCard onTab={onTab} className="rise" style={{ ...at(step + 4), order: order.upcoming }} />

      <div className="rise" style={{ ...at(step + 5), order: order.inbox }}>
        <InboxCard items={data.inbox} onNotify={onNotify} />
      </div>
      <div className="rise" style={{ ...at(step + 6), order: order.day }}>
        <DayCard data={data} onTab={onTab} />
      </div>
      <div className="rise" style={{ ...at(step + 7), order: order.review }}>
        <ReviewCard data={data} onNotify={onNotify} />
      </div>
    </section>
  );
}
