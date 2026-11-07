import { useRef, useState } from 'react';
import { ArrowUpRight, Check, Plus, Sparkles, Sprout, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { flyToInbox } from '../capture/fly';
import { openCapture } from '../capture/ui';
import { addToInbox } from '../inbox/file';
import { dayKey, toggleDay } from '../habits/model';
import { habits } from '../habits/store';
import { dueLabel, moveCard } from '../missions/model';
import { missions } from '../missions/store';
import { useCountUp, useJustCompleted } from '../motion/hooks';
import { Burst, DrawnTick, Leave, ProgressRing } from '../motion/Pieces';
import SwipeToDone from '../motion/SwipeToDone';
import { tr } from '../lang';
import { formatVnd } from '../wallet/model';
import DayCard from './DayCard';
import InboxCard from './InboxCard';
import ReviewCard from './ReviewCard';
import { useLifeData } from './useLifeData';
import { buildToday } from './model';

const STATE_TONE = { overdue: 'danger', today: 'signal', soon: 'warn', doing: 'default' };
const stateLabel = (task) => (task.state === 'doing' ? tr('In progress') : task.state === 'overdue' ? tr('Overdue') : dueLabel(task.due));

// each block of the screen arrives a little after the one before
const at = (i) => ({ '--i': i });

/** One line to type into: Enter puts it in the Inbox (and the words fly there); the plus opens the full capture sheet. */
function QuickInput({ onNotify }) {
  const [text, setText] = useState('');
  const form = useRef(null);
  const submit = async (event) => {
    event.preventDefault();
    const line = text.trim();
    if (!line) return openCapture('', event.nativeEvent.submitter);
    try {
      const where = form.current?.getBoundingClientRect();
      await addToInbox(line);
      flyToInbox(where, line);
      setText('');
      onNotify?.(tr('Added to your Inbox'));
    } catch {
      onNotify?.(tr('That could not be saved on this device'));
    }
    return undefined;
  };
  return (
    <form ref={form} onSubmit={submit} className="flex items-center gap-2 rounded-full border border-line-strong bg-ink-1 py-1.5 pr-1.5 pl-4 transition-[border-color,box-shadow] duration-300 focus-within:border-signal focus-within:shadow-[0_0_0_4px_var(--color-signal-soft)]" data-quick-capture>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tr('Capture anything: lunch 45k, call mum tomorrow…')}
        aria-label={tr('Capture anything')}
        enterKeyHint="send"
        autoComplete="off"
        className="h-9 min-w-0 flex-1 bg-transparent text-fine text-bone placeholder:text-bone-faint focus:outline-none"
      />
      <button type="submit" aria-label={text.trim() ? tr('Add to Inbox') : tr('Open quick capture')} className="grid size-9 shrink-0 place-items-center rounded-full bg-signal text-ink-0 transition-transform duration-300 active:scale-90">
        <Plus size={18} strokeWidth={2.2} className={clsx('transition-transform duration-300', text.trim() && 'rotate-45')} aria-hidden="true" />
      </button>
    </form>
  );
}

/**
 * A task that can be finished by tapping its circle or by swiping it to the right. The circle fills and a tick is drawn, the row
 * folds shut and the ones below slide up, and only then is the task really moved to Done.
 */
function TaskRow({ task, first, onFinish }) {
  const [phase, setPhase] = useState('idle'); // idle | ticked | leaving
  const finish = () => {
    if (phase !== 'idle') return;
    setPhase('ticked');
    window.setTimeout(() => setPhase('leaving'), 380);
    window.setTimeout(() => onFinish(task), 760);
  };
  const ticked = phase !== 'idle';
  return (
    <li>
      <Leave leaving={phase === 'leaving'}>
        <SwipeToDone onDone={finish} disabled={ticked}>
          <div className={clsx('flex items-center gap-3 py-2.5', first ? 'pt-0' : 'border-t border-line')}>
            <button
              type="button"
              onClick={finish}
              aria-label={tr('Mark "{0}" as done', task.title)}
              className={clsx('grid size-6 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-300 active:scale-90', ticked ? 'border-signal bg-signal text-ink-0' : 'border-line-strong text-transparent hover:border-signal hover:text-signal')}
            >
              {ticked ? <DrawnTick size={13} /> : <Check size={13} aria-hidden="true" />}
            </button>
            <span className={clsx('min-w-0 flex-1 truncate text-fine transition-colors duration-300', ticked ? 'text-bone-faint line-through' : 'text-bone')}>{task.title}</span>
            <Badge tone={STATE_TONE[task.state]}>{stateLabel(task)}</Badge>
          </div>
        </SwipeToDone>
      </Leave>
    </li>
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
  const allClear = useJustCompleted(nothingDue);
  const gardenDone = habitState.total > 0 && habitState.pending.length === 0;
  const gardenJust = useJustCompleted(gardenDone);
  const spentShown = Math.round(useCountUp(spent.total));
  const step = 1 + nudges.length;

  return (
    <section aria-label={tr('Today')} className="flex flex-col gap-4" data-today>
      <div className="rise" style={at(0)}>
        <QuickInput onNotify={onNotify} />
      </div>

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rise" style={at(step)}>
          <CardHeader
            eyebrow={tr('DO NOW')}
            title={allClear ? tr('All clear for today') : nothingDue ? tr('Nothing is due') : tr('What needs you')}
            aside={
              <span className="relative grid size-7 place-items-center">
                <Check size={17} aria-hidden="true" />
                {allClear && <Burst />}
              </span>
            }
          />
          {nothingDue ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-fine text-bone-dim">{tr('No task is due or overdue. Add one, or enjoy the quiet.')}</p>
              <Button variant="ghost" size="sm" onClick={() => onTab('missions')}>
                <Plus size={14} aria-hidden="true" /> {tr('Open the Mission Board')}
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {tasks.map((task, index) => (
                <TaskRow key={task.id} task={task} first={index === 0} onFinish={finish} />
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

        <Card className="rise" style={at(step + 1)}>
          <CardHeader eyebrow={tr('HABITS & MONEY')} title={tr('Today so far')} />
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {habitState.total > 0 && (
                <span className="relative shrink-0">
                  <ProgressRing value={habitState.done / habitState.total} size={58} label={tr('{0} of {1} habits done. Tap to tick one.', habitState.done, habitState.total)}>
                    <Sprout size={18} className={gardenDone ? 'text-signal' : 'text-bone-dim'} aria-hidden="true" />
                  </ProgressRing>
                  {gardenJust && <Burst />}
                </span>
              )}
              <div className="min-w-0 flex-1">
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
                        <button key={habit.id} type="button" onClick={() => water(habit)} aria-label={tr('Mark "{0}" as done', habit.name)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-fine text-bone-dim transition-[color,border-color,transform] duration-300 hover:border-signal hover:text-bone active:scale-95">
                          <Sprout size={13} aria-hidden="true" /> {habit.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={() => onTab('wallet')} className="flex items-center gap-3 border-t border-line pt-3 text-left">
              <Wallet size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />
              <span className="flex-1 text-fine text-bone-dim">{spent.count ? tr('Spent today ({0} lines)', spent.count) : tr('Nothing spent yet today')}</span>
              <b className="font-mono text-fine font-medium text-bone tabular-nums">{formatVnd(spentShown)}</b>
            </button>
          </div>
        </Card>
      </div>

      <div className="rise" style={at(step + 2)}>
        <InboxCard items={data.inbox} onNotify={onNotify} />
      </div>
      <div className="rise" style={at(step + 3)}>
        <DayCard data={data} onTab={onTab} />
      </div>
      <div className="rise" style={at(step + 4)}>
        <ReviewCard data={data} onNotify={onNotify} />
      </div>
    </section>
  );
}
