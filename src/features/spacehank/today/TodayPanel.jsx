import { useState } from 'react';
import { ArrowUpRight, Check, Plus, Sparkles, Sprout, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { openCapture } from '../capture/ui';
import { addToInbox } from '../inbox/file';
import { dayKey, toggleDay } from '../habits/model';
import { habits } from '../habits/store';
import { dueLabel, moveCard } from '../missions/model';
import { missions } from '../missions/store';
import { tr } from '../lang';
import { formatVnd } from '../wallet/model';
import DayCard from './DayCard';
import InboxCard from './InboxCard';
import ReviewCard from './ReviewCard';
import { useLifeData } from './useLifeData';
import { buildToday } from './model';

const STATE_TONE = { overdue: 'danger', today: 'signal', soon: 'warn', doing: 'default' };
const stateLabel = (task) => (task.state === 'doing' ? tr('In progress') : task.state === 'overdue' ? tr('Overdue') : dueLabel(task.due));

/** One line to type into: Enter puts it in the Inbox; the plus opens the full capture sheet (photo of a receipt, filing now). */
function QuickInput({ onNotify }) {
  const [text, setText] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    const line = text.trim();
    if (!line) return openCapture();
    try {
      await addToInbox(line);
      setText('');
      onNotify?.(tr('Added to your Inbox'));
    } catch {
      onNotify?.(tr('That could not be saved on this device'));
    }
    return undefined;
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-full border border-line-strong bg-ink-1 py-1.5 pr-1.5 pl-4 focus-within:border-signal" data-quick-capture>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tr('Capture anything: lunch 45k, call mum tomorrow…')}
        aria-label={tr('Capture anything')}
        enterKeyHint="send"
        autoComplete="off"
        className="h-9 min-w-0 flex-1 bg-transparent text-fine text-bone placeholder:text-bone-faint focus:outline-none"
      />
      <button type="submit" aria-label={text.trim() ? tr('Add to Inbox') : tr('Open quick capture')} className="grid size-9 shrink-0 place-items-center rounded-full bg-signal text-ink-0 active:scale-90">
        <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </form>
  );
}

/**
 * The top of the home screen: what needs you now. A place to capture anything in one line, Hank's one or two nudges, what is
 * due, the habits not done, today's spending, the Inbox to sort, the week in numbers and the day as a timeline.
 */
export default function TodayPanel({ onTab, onNotify }) {
  const data = useLifeData();
  const today = buildToday(data);
  const { tasks, deadlines, habits: habitState, spent, nudges } = today;
  const key = dayKey();

  const finish = (task) => {
    const changed = moveCard(missions.store.get().items, task.id, 'done', 0);
    void missions.putMany(changed);
    onNotify?.(tr('Marked as done'));
  };
  const water = (habit) => void habits.update(habit.id, { days: toggleDay(habit.days, key) });

  const nothingDue = !tasks.length && !deadlines.length;

  return (
    <section aria-label={tr('Today')} className="flex flex-col gap-4" data-today>
      <QuickInput onNotify={onNotify} />

      {nudges.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={tr('Hank suggests')}>
          {nudges.map((nudge) => (
            <li key={nudge.id} className="flex items-center gap-3 rounded-2xl border border-line bg-ink-1 px-4 py-3">
              <Sparkles size={15} className="shrink-0 text-signal" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-fine text-bone">{nudge.text}</span>
              {nudge.tab && (
                <button type="button" onClick={() => onTab(nudge.tab)} aria-label={tr('Open')} className="grid size-8 shrink-0 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader eyebrow={tr('DO NOW')} title={nothingDue ? tr('Nothing is due') : tr('What needs you')} aside={<Check size={17} aria-hidden="true" />} />
          {nothingDue ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-fine text-bone-dim">{tr('No task is due or overdue. Add one, or enjoy the quiet.')}</p>
              <Button variant="ghost" size="sm" onClick={() => onTab('missions')}>
                <Plus size={14} aria-hidden="true" /> {tr('Open the Mission Board')}
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
                  <button type="button" onClick={() => finish(task)} aria-label={tr('Mark "{0}" as done', task.title)} className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-transparent transition-colors hover:border-signal hover:text-signal active:scale-90">
                    <Check size={13} aria-hidden="true" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-fine text-bone">{task.title}</span>
                  <Badge tone={STATE_TONE[task.state]}>{stateLabel(task)}</Badge>
                </li>
              ))}
              {deadlines.map((item) => (
                <li key={item.id} className="flex items-center gap-3 border-t border-line py-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-3 font-mono text-[0.62rem] text-bone-dim" aria-hidden="true">
                    {item.kind === 'exam' ? 'E' : 'D'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fine text-bone">
                    {item.title}
                    {item.course && <small className="ml-2 font-mono text-[0.7rem] text-bone-faint">{item.course}</small>}
                  </span>
                  <Badge tone={item.bucket === 'overdue' ? 'danger' : item.bucket === 'today' ? 'signal' : 'warn'}>{item.bucket === 'overdue' ? tr('Overdue') : item.bucket === 'today' ? tr('Today') : tr('Tomorrow')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow={tr('HABITS & MONEY')} title={tr('Today so far')} aside={<Sprout size={17} aria-hidden="true" />} />
          <div className="flex flex-col gap-4">
            <div>
              {habitState.total === 0 ? (
                <button type="button" onClick={() => onTab('habits')} className="text-fine text-bone-dim underline underline-offset-4">
                  {tr('Plant your first habit')}
                </button>
              ) : habitState.pending.length === 0 ? (
                <p className="text-fine text-bone-dim">{tr('Every habit is done today.')}</p>
              ) : (
                <>
                  <p className="mb-2 font-mono text-[0.72rem] text-bone-faint">{tr('{0} of {1} habits done. Tap to tick one.', habitState.done, habitState.total)}</p>
                  <div className="flex flex-wrap gap-2">
                    {habitState.pending.map((habit) => (
                      <button key={habit.id} type="button" onClick={() => water(habit)} aria-label={tr('Mark "{0}" as done', habit.name)} className={clsx('inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-fine text-bone-dim transition-colors hover:border-signal hover:text-bone active:scale-95')}>
                        <Sprout size={13} aria-hidden="true" /> {habit.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => onTab('wallet')} className="flex items-center gap-3 border-t border-line pt-3 text-left">
              <Wallet size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />
              <span className="flex-1 text-fine text-bone-dim">{spent.count ? tr('Spent today ({0} lines)', spent.count) : tr('Nothing spent yet today')}</span>
              <b className="font-mono text-fine font-medium text-bone">{formatVnd(spent.total)}</b>
            </button>
          </div>
        </Card>
      </div>

      <InboxCard items={data.inbox} onNotify={onNotify} />
      <DayCard data={data} onTab={onTab} />
      <ReviewCard data={data} onNotify={onNotify} />
    </section>
  );
}
