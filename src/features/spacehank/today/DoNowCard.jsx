import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Badge, Button, Card, Eyebrow } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { dueLabel } from '../missions/model';
import { useJustCompleted } from '../motion/hooks';
import { Burst, DrawnTick, Leave } from '../motion/Pieces';
import SwipeToDone from '../motion/SwipeToDone';
import { tr } from '../lang';

const STATE_TONE = { overdue: 'danger', today: 'signal', soon: 'warn', doing: 'default' };
const stateLabel = (task) => (task.state === 'doing' ? tr('In progress') : task.state === 'overdue' ? tr('Overdue') : dueLabel(task.due));

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

/** The feature card of the screen: how many things need you now, as a big number, and the things themselves. */
export default function DoNowCard({ tasks, deadlines, onFinish, onTab, className, style }) {
  const count = tasks.length + deadlines.length;
  const nothingDue = count === 0;
  const allClear = useJustCompleted(nothingDue);

  return (
    <Card className={clsx('tint-card', className)} style={{ '--card-hue': 196, ...style }}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="flex items-end gap-4">
          <span className="relative">
            <b className="numeral block text-[clamp(4rem,16vw,6.5rem)] text-bone" aria-hidden="true">
              {nothingDue ? '0' : count}
            </b>
            {allClear && <Burst />}
          </span>
          <span className="pb-2 leading-tight">
            <Eyebrow>{tr('DO NOW')}</Eyebrow>
            <span className="mt-1 block font-display text-[1.35rem] text-bone">{allClear ? tr('All clear for today') : nothingDue ? tr('Nothing is due') : tr('What needs you')}</span>
          </span>
        </div>
      </div>

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
            <TaskRow key={task.id} task={task} first={index === 0} onFinish={onFinish} />
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
  );
}
