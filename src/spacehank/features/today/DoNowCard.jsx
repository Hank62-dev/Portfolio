import { useRef, useState } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { Button, Card, Eyebrow } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { dueLabel } from '../missions/model';
import { useJustCompleted } from '../../core/motion/hooks';
import { Burst, DrawnTick } from '../../core/motion/Pieces';
import { tr } from '../../core/i18n/lang';
import { celebrate } from '../../core/celebrate';

const stateLabel = (task) => (task.state === 'doing' ? tr('In progress') : task.state === 'overdue' ? tr('Overdue') : dueLabel(task.due));

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

// each note leans a little its own way, as if pinned by hand
const TILT = [-2.4, 1.6, -1.1, 2.2, -1.8, 1.2];

/**
 * A task as a sticky note pinned to the board, in the colour of how urgent it is. Tapping its tick draws the tick, the note
 * comes unpinned and falls away, and only then is the task really moved to Done.
 */
function Note({ task, index, onFinish }) {
  const [phase, setPhase] = useState('idle'); // idle | ticked | falling
  const tick = useRef(null);
  const finish = () => {
    if (phase !== 'idle') return;
    setPhase('ticked');
    celebrate(tick.current, { count: 16 });
    window.setTimeout(() => setPhase('falling'), 380);
    window.setTimeout(() => onFinish(task), 900);
  };
  return (
    <li className="pin-note" data-state={task.state} data-phase={phase} style={{ '--tilt': `${TILT[index % TILT.length]}deg`, '--i': index }}>
      <i className="pin-tack" aria-hidden="true" />
      <small className="pin-when">{stateLabel(task)}</small>
      <span className={clsx('pin-title', phase !== 'idle' && 'line-through opacity-60')}>{task.title}</span>
      <button ref={tick} type="button" onClick={finish} aria-label={tr('Mark "{0}" as done', task.title)} className="pin-tick">
        {phase !== 'idle' ? <DrawnTick size={13} /> : <Check size={13} aria-hidden="true" />}
      </button>
    </li>
  );
}

/** An exam or a deadline from Study, pinned as a card of its own (it is finished in Study, not here). */
function DeadlineNote({ item, index }) {
  const state = item.bucket === 'overdue' ? 'overdue' : item.bucket === 'today' ? 'today' : 'soon';
  return (
    <li className="pin-note pin-card" data-state={state} style={{ '--tilt': `${TILT[(index + 3) % TILT.length]}deg`, '--i': index }}>
      <i className="pin-tack" aria-hidden="true" />
      <small className="pin-when">
        {item.kind === 'exam' ? tr('Exam') : tr('Deadline')} · {item.bucket === 'overdue' ? tr('Overdue') : item.bucket === 'today' ? tr('Today') : tr('Tomorrow')}
      </small>
      <span className="pin-title">{item.title}</span>
      {item.course && <small className="pin-course">{item.course}</small>}
    </li>
  );
}

/**
 * The feature card of the screen, as a pinboard: what needs you now are sticky notes pinned to it, coloured by how urgent they
 * are; a stamp in the corner counts them and what was done today. With nothing due, the board holds one note that says so and
 * an empty dashed spot to pin a new one.
 */
export default function DoNowCard({ tasks, deadlines, doneToday = 0, onFinish, onTab, className, style }) {
  const count = tasks.length + deadlines.length;
  const nothingDue = count === 0;
  const allClear = useJustCompleted(nothingDue);

  return (
    <Card className={clsx('pinboard relative flex flex-col overflow-hidden', className)} style={style}>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <span className="min-w-0 leading-tight">
          <Eyebrow>{tr('DO NOW')}</Eyebrow>
          <span className="mt-1 block font-display text-[clamp(1.6rem,3vw,2.2rem)] text-bone">{allClear ? tr('All clear for today') : nothingDue ? tr('Nothing is due') : tr('What needs you')}</span>
          {!nothingDue && <Urgency tasks={tasks} deadlines={deadlines} />}
        </span>
        <span className="pin-stamp relative" aria-label={tr('{0} done today', doneToday)} role="img">
          <b className="numeral text-[2.4rem]">{nothingDue ? doneToday : count}</b>
          <small>{nothingDue ? tr('done today') : tr('to do')}</small>
          {allClear && <Burst />}
        </span>
      </div>

      <ul className="pin-board relative z-10 mt-5 grid flex-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task, index) => (
          <Note key={task.id} task={task} index={index} onFinish={onFinish} />
        ))}
        {deadlines.map((item, index) => (
          <DeadlineNote key={item.id} item={item} index={tasks.length + index} />
        ))}
        {nothingDue && (
          <li className="pin-note" data-state="clear" style={{ '--tilt': '-2deg', '--i': 0 }}>
            <i className="pin-tack" aria-hidden="true" />
            <small className="pin-when">{tr('Today')}</small>
            <span className="pin-title">{tr('No task is due or overdue. Add one, or enjoy the quiet.')}</span>
            <svg viewBox="0 0 80 30" className="pin-doodle" aria-hidden="true">
              <path d="M4 22 C14 6 22 6 28 18 S44 30 50 14 S66 2 76 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </li>
        )}
        <li>
          <button type="button" onClick={() => onTab('missions')} className="pin-empty" style={{ '--tilt': '1.5deg' }}>
            <Plus size={18} aria-hidden="true" />
            {tr('Pin a new task')}
          </button>
        </li>
      </ul>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-5">
        <small className="font-mono text-[0.66rem] text-bone-faint max-sm:hidden">{nothingDue ? '' : tr('Tick a note to finish it')}</small>
        <Button variant="ghost" size="sm" onClick={() => onTab('missions')} className="ml-auto">
          {tr('Open the Mission Board')} <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
