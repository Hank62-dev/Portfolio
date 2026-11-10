import { useState } from 'react';
import { ArrowRight, Check, PartyPopper, Plus } from 'lucide-react';
import { Badge, Button, Card, Eyebrow } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { dueLabel } from '../missions/model';
import { useJustCompleted } from '../motion/hooks';
import { Burst, DrawnTick, Leave, ProgressRing } from '../motion/Pieces';
import SwipeToDone from '../motion/SwipeToDone';
import { tr } from '../lang';

const STATE_TONE = { overdue: 'danger', today: 'signal', soon: 'warn', doing: 'default' };
const stateLabel = (task) => (task.state === 'doing' ? tr('In progress') : task.state === 'overdue' ? tr('Overdue') : dueLabel(task.due));

/**
 * A task that can be finished by tapping its circle or by swiping it to the right. The circle fills and a tick is drawn, the row
 * folds shut and the ones below slide up, and only then is the task really moved to Done. A coloured edge says how urgent it is.
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
          <div className="task-row" data-state={task.state} data-ticked={ticked ? '' : undefined}>
            <button
              type="button"
              onClick={finish}
              aria-label={tr('Mark "{0}" as done', task.title)}
              className={clsx('grid size-6 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-300 active:scale-90', ticked ? 'border-signal bg-signal text-ink-0' : 'border-line-strong text-transparent hover:border-signal hover:text-signal')}
            >
              {ticked ? <DrawnTick size={13} /> : <Check size={13} aria-hidden="true" />}
            </button>
            <span className={clsx('min-w-0 flex-1 transition-colors duration-300', ticked ? 'text-bone-faint line-through' : 'text-bone')}>
              {first && !ticked && <small className="mb-0.5 block font-mono text-[0.58rem] tracking-[0.16em] text-signal uppercase">{tr('NEXT')}</small>}
              <span className="block truncate text-fine">{task.title}</span>
            </span>
            <Badge tone={STATE_TONE[task.state]}>{stateLabel(task)}</Badge>
          </div>
        </SwipeToDone>
      </Leave>
    </li>
  );
}

/** How the things that need you split by urgency, as small counts. */
function Urgency({ tasks, deadlines }) {
  const count = (state) => tasks.filter((t) => t.state === state).length + deadlines.filter((d) => d.bucket === state).length;
  const parts = [
    { id: 'overdue', n: count('overdue'), label: tr('Overdue'), tone: 'danger' },
    { id: 'today', n: count('today'), label: tr('Today'), tone: 'signal' },
    { id: 'soon', n: tasks.filter((t) => t.state === 'soon').length + deadlines.filter((d) => d.bucket === 'tomorrow').length, label: tr('Soon'), tone: 'warn' },
    { id: 'doing', n: tasks.filter((t) => t.state === 'doing').length, label: tr('In progress'), tone: 'ink' },
  ].filter((p) => p.n > 0);
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5" aria-hidden="true">
      {parts.map((p) => (
        <span key={p.id} className="urgency" data-tone={p.tone}>
          <b className="tabular-nums">{p.n}</b> {p.label}
        </span>
      ))}
    </div>
  );
}

/** The feature card of the screen: how many things need you now, in a ring that fills as the day gets done, and the things themselves. */
export default function DoNowCard({ tasks, deadlines, doneToday = 0, onFinish, onTab, className, style }) {
  const count = tasks.length + deadlines.length;
  const nothingDue = count === 0;
  const allClear = useJustCompleted(nothingDue);
  const share = count + doneToday > 0 ? doneToday / (count + doneToday) : nothingDue ? 1 : 0;

  return (
    <Card className={clsx('tint-card donow relative flex flex-col overflow-hidden', className)} style={{ '--card-hue': 196, ...style }}>
      <span className="donow-art" aria-hidden="true" />
      <span className="donow-orb" aria-hidden="true" />

      <div className="relative z-10 mb-5 flex items-center gap-4 sm:gap-5">
        <span className="relative shrink-0">
          <ProgressRing value={share} size={118} stroke={7} label={tr('{0} done today', doneToday)}>
            {nothingDue ? <PartyPopper size={34} className="text-signal" strokeWidth={1.6} aria-hidden="true" /> : <b className="numeral numeral-tint text-[3.6rem]">{count}</b>}
          </ProgressRing>
          {allClear && <Burst />}
        </span>
        <span className="min-w-0 leading-tight">
          <Eyebrow>{tr('DO NOW')}</Eyebrow>
          <span className="mt-1 block font-display text-[1.6rem] text-bone">{allClear ? tr('All clear for today') : nothingDue ? tr('Nothing is due') : tr('What needs you')}</span>
          {doneToday > 0 && <small className="mt-1 block font-mono text-[0.68rem] text-bone-faint">{tr('{0} done today', doneToday)}</small>}
          {!nothingDue && <Urgency tasks={tasks} deadlines={deadlines} />}
        </span>
      </div>

      {nothingDue ? (
        <div className="relative z-10 flex flex-col items-start gap-3">
          <p className="text-fine text-bone-dim">{tr('No task is due or overdue. Add one, or enjoy the quiet.')}</p>
        </div>
      ) : (
        <ul className="relative z-10 flex flex-col gap-2">
          {tasks.map((task, index) => (
            <TaskRow key={task.id} task={task} first={index === 0} onFinish={onFinish} />
          ))}
          {deadlines.map((item) => (
            <li key={item.id}>
              <div className="task-row" data-state={item.bucket === 'overdue' ? 'overdue' : item.bucket === 'today' ? 'today' : 'soon'}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-3 font-mono text-[0.62rem] text-bone-dim" aria-hidden="true">
                  {item.kind === 'exam' ? 'E' : 'D'}
                </span>
                <span className="min-w-0 flex-1 truncate text-fine text-bone">
                  {item.title}
                  {item.course && <small className="ml-2 font-mono text-[0.7rem] text-bone-faint">{item.course}</small>}
                </span>
                <Badge tone={item.bucket === 'overdue' ? 'danger' : item.bucket === 'today' ? 'signal' : 'warn'}>{item.bucket === 'overdue' ? tr('Overdue') : item.bucket === 'today' ? tr('Today') : tr('Tomorrow')}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-5">
        <small className="font-mono text-[0.66rem] text-bone-faint max-sm:hidden">{nothingDue ? '' : tr('Tap the circle or swipe right to finish')}</small>
        <Button variant="ghost" size="sm" onClick={() => onTab('missions')} className="ml-auto">
          {nothingDue ? <Plus size={14} aria-hidden="true" /> : null} {tr('Open the Mission Board')} {nothingDue ? null : <ArrowRight size={14} aria-hidden="true" />}
        </Button>
      </div>
    </Card>
  );
}
