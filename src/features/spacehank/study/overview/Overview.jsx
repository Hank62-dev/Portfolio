import { useMemo, useState } from 'react';
import { BookOpenCheck, CalendarClock, Check, ChevronDown, Flag, KanbanSquare, ListChecks, Pencil, Plus, Sparkles } from 'lucide-react';
import { Badge, Button } from '../../../../design-system';
import { clsx } from '../../../../lib/format';
import { useFab } from '../../fab';
import { Segmented } from '../../components/Page';
import { countdown } from '../model';
import { agenda, columnItems, courseProgress, saveItem, stepsProgress, weekSummary } from '../planner';
import { courses, flashcards, sampleStudy } from '../store';
import { CourseSheet, ItemSheet } from './Sheets';
import { isDemo } from '../../demo/mode';

const TONE = { past: 'danger', soon: 'warn', later: 'default' };
const VIEWS = [
  { id: 'agenda', label: 'Agenda', icon: ListChecks },
  { id: 'board', label: 'Board', icon: KanbanSquare },
];

/** One of the four numbers across the top. */
function Stat({ value, label, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={clsx('min-w-0 rounded-2xl border border-line bg-ink-1 px-3 py-3 text-left', onClick && 'transition-colors hover:border-line-strong active:bg-ink-2')}>
      <b className={clsx('block font-display text-[1.6rem] leading-none tabular-nums', tone ?? 'text-bone')}>{value}</b>
      <small className="mt-1.5 block truncate text-[0.72rem] text-bone-faint">{label}</small>
    </Tag>
  );
}

const toggleDeadline = (course, id) => courses.update(course.id, { deadlines: course.deadlines.map((d) => (d.id === id ? { ...d, done: !d.done } : d)) });

/** A line in the agenda: tick it off, or tap it for the details. */
function AgendaRow({ item, now, onOpen }) {
  const { course } = item;
  const c = countdown(item.at, now);
  const steps = stepsProgress(item);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3" data-item={item.title}>
      {item.kind === 'deadline' ? (
        <button type="button" role="checkbox" aria-checked={item.done} aria-label={`Mark ${item.title} done`} onClick={() => toggleDeadline(course, item.id)} className={clsx('grid size-7 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90', item.done ? 'border-ok bg-ok text-ink-0' : 'border-line-strong text-transparent hover:text-bone-faint')}>
          <Check size={15} strokeWidth={3} aria-hidden="true" />
        </button>
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-warn/15 text-warn" title="Exam">
          <BookOpenCheck size={15} aria-hidden="true" />
        </span>
      )}
      <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left leading-tight" aria-label={`Open: ${item.title}`}>
        <b className={clsx('block truncate text-fine font-medium', item.done ? 'text-bone-faint line-through' : 'text-bone')}>{item.title}</b>
        <small className="mt-1 flex items-center gap-1.5 font-mono text-[0.68rem] text-bone-faint">
          <i className="size-2 shrink-0 rounded-full" style={{ background: `hsl(${course.hue} 80% 65%)` }} aria-hidden="true" />
          <span className="truncate">{course.code || course.name}</span>
          {item.kind === 'exam' && <span>· Exam</span>}
          {steps.total > 0 && (
            <span>
              · {steps.done}/{steps.total}
            </span>
          )}
        </small>
      </button>
      {item.priority === 'high' && !item.done && <Flag size={14} className="shrink-0 text-danger" aria-label="High priority" />}
      {!item.done && <Badge tone={TONE[c.tone]}>{c.label}</Badge>}
    </li>
  );
}

function AgendaView({ list, now, onOpen }) {
  const { groups, done } = useMemo(() => agenda(list, now), [list, now]);
  const [showDone, setShowDone] = useState(false);
  if (!groups.length && !done.length)
    return (
      <div className="rounded-[1.75rem] border border-dashed border-line-strong p-6 text-fine text-bone-dim" data-agenda-empty>
        Nothing to do. Add a deadline or an exam to a course and it shows up here, grouped by when it is due.
      </div>
    );
  return (
    <div className="flex flex-col gap-5" data-agenda>
      {groups.length === 0 && <p className="px-1 text-fine text-bone-dim">Everything is done. Nice.</p>}
      {groups.map((group) => (
        <section key={group.id} aria-label={group.label} data-group={group.id}>
          <h3 className={clsx('mb-2 flex items-center gap-2 px-1 font-mono text-[0.68rem] tracking-[0.12em] uppercase', group.id === 'overdue' ? 'text-danger' : 'text-bone-faint')}>
            {group.label} <span className="rounded-full bg-white/[0.07] px-1.5 tabular-nums">{group.items.length}</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <AgendaRow key={item.id} item={item} now={now} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
      {done.length > 0 && (
        <section aria-label="Completed">
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="mb-2 flex items-center gap-2 px-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">
            Completed <span className="rounded-full bg-white/[0.07] px-1.5 tabular-nums">{done.length}</span>
            <ChevronDown size={13} className={clsx('transition-transform', showDone && 'rotate-180')} aria-hidden="true" />
          </button>
          {showDone && (
            <ul className="flex flex-col gap-2">
              {done.slice(0, 15).map((item) => (
                <AgendaRow key={item.id} item={item} now={now} onOpen={onOpen} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** A card on the board, like a Trello card: kind and priority labels, the title, the date, and the progress of its steps. */
function BoardCard({ item, now, onOpen, onDragStart }) {
  const c = countdown(item.at, now);
  const steps = stepsProgress(item);
  return (
    <li draggable onDragStart={(e) => onDragStart(e, item)} className="list-none" data-board-card={item.title}>
      <div className={clsx('relative rounded-2xl border bg-ink-2 p-3 transition-all hover:-translate-y-0.5 hover:border-line-strong', item.done ? 'border-line opacity-60' : 'border-line')}>
        <button type="button" onClick={() => onOpen(item)} className="block w-full text-left" aria-label={`Open: ${item.title}`}>
          <span className="mb-2 flex flex-wrap gap-1">
            {item.kind === 'exam' && <span className="rounded-full bg-warn/15 px-2 py-px font-mono text-[0.64rem] text-warn">Exam</span>}
            {item.priority === 'high' && !item.done && <span className="rounded-full bg-danger/15 px-2 py-px font-mono text-[0.64rem] text-danger">High</span>}
            {item.priority === 'low' && !item.done && <span className="rounded-full bg-white/[0.07] px-2 py-px font-mono text-[0.64rem] text-bone-faint">Low</span>}
          </span>
          <b className={clsx('block text-fine leading-snug font-medium', item.done ? 'text-bone-faint line-through' : 'text-bone')}>{item.title}</b>
          <span className="mt-2 flex items-center gap-2">
            {item.done ? <Badge tone="ok">Done</Badge> : <Badge tone={TONE[c.tone]}>{c.label}</Badge>}
            {steps.total > 0 && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] text-bone-faint">
                <ListChecks size={12} aria-hidden="true" /> {steps.done}/{steps.total}
              </span>
            )}
          </span>
          {steps.total > 0 && (
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
              <i className="block h-full rounded-full bg-signal transition-[width] duration-500" style={{ width: `${steps.pct}%` }} />
            </span>
          )}
        </button>
      </div>
    </li>
  );
}

function BoardView({ list, now, onOpen, onAdd, onEditCourse, onNewCourse, onMove }) {
  const [over, setOver] = useState(null);
  return (
    <div className="no-scrollbar -mx-5 flex scroll-px-5 snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-3 md:mx-0 md:scroll-px-0 md:px-0" data-board>
      {list.map((course) => {
        const items = columnItems(course, now);
        const pct = courseProgress(course);
        return (
          <section
            key={course.id}
            aria-label={course.name}
            data-column-course={course.name}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(course.id);
            }}
            onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget) || setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onMove(id, course.id);
            }}
            className={clsx('flex w-[17.5rem] shrink-0 snap-start flex-col gap-2.5 rounded-[1.75rem] border bg-ink-1 p-3 transition-colors max-md:w-[82vw]', over === course.id ? 'border-signal' : 'border-line')}
          >
            <header className="flex items-center gap-2.5 px-1 pt-1">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl font-mono text-[0.66rem] font-semibold" style={{ background: `hsl(${course.hue} 60% 50% / 0.2)`, color: `hsl(${course.hue} 85% 78%)` }}>
                {(course.code || course.name).slice(0, 3).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <h3 className="truncate font-display text-lead text-bone">{course.name}</h3>
                <p className="font-mono text-[0.66rem] text-bone-faint">{pct === null ? 'No deadlines yet' : `${pct}% done`}</p>
              </div>
              <button type="button" aria-label={`Edit ${course.name}`} onClick={() => onEditCourse(course)} className="grid size-8 place-items-center rounded-full text-bone-faint hover:bg-white/10 hover:text-bone">
                <Pencil size={14} aria-hidden="true" />
              </button>
            </header>
            {pct !== null && (
              <span className="mx-1 block h-1 overflow-hidden rounded-full bg-white/10">
                <i className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: `hsl(${course.hue} 70% 58%)` }} />
              </span>
            )}
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <BoardCard key={item.id} item={item} now={now} onOpen={onOpen} onDragStart={(e, it) => e.dataTransfer.setData('text/plain', it.id)} />
              ))}
            </ul>
            <button type="button" onClick={() => onAdd(course)} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-fine text-bone-faint transition-colors hover:bg-white/[0.05] hover:text-bone">
              <Plus size={15} aria-hidden="true" /> Add a card
            </button>
          </section>
        );
      })}
      <button type="button" onClick={onNewCourse} className="grid min-h-28 w-[17.5rem] shrink-0 snap-start place-items-center rounded-[1.75rem] border border-dashed border-line-strong p-4 text-fine text-bone-faint transition-colors hover:border-bone hover:text-bone max-md:w-[82vw]">
        <span className="flex items-center gap-2">
          <Plus size={15} aria-hidden="true" /> Add a course
        </span>
      </button>
    </div>
  );
}

/**
 * The Overview of the Study Hub: how the week looks in four numbers, then either an agenda of what is due (grouped by when,
 * as in a task manager) or a board with a column for each course (as in Trello).
 */
export default function Overview({ list, cardList, onTab }) {
  const [view, setView] = useState('agenda');
  const [sheet, setSheet] = useState(null); // { type: 'item', item?, courseId?, kind? } or { type: 'course', course? }
  const now = Date.now();
  const summary = useMemo(() => weekSummary(list, cardList, now), [list, cardList, now]);
  const hasCourses = list.length > 0;

  const addItem = (course) => setSheet({ type: 'item', courseId: course?.id });
  useFab({ label: hasCourses ? 'Add a deadline or exam' : 'Add a course', icon: Plus, onPress: () => (hasCourses ? addItem() : setSheet({ type: 'course' })) });

  const openItem = (item) => setSheet({ type: 'item', item });
  const move = async (id, courseId) => {
    const item = list.flatMap((c) => [...(c.exams ?? []).map((x) => ({ ...x, kind: 'exam' })), ...(c.deadlines ?? []).map((x) => ({ ...x, kind: 'deadline' }))]).find((x) => x.id === id);
    if (!item) return;
    const updates = saveItem(list, item, { kind: item.kind, courseId });
    await Promise.all(updates.map((u) => courses.update(u.id, u.patch)));
  };
  const addSample = async () => {
    const s = sampleStudy();
    await courses.put(s.course);
    await flashcards.putMany(s.cards);
  };

  if (!hasCourses && !sheet)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong p-8 text-center" data-overview-empty>
        <span className="grid size-12 place-items-center rounded-2xl bg-signal/15 text-signal">
          <CalendarClock size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lead text-bone">Plan your courses</h2>
          <p className="mt-1 max-w-[36ch] text-fine text-bone-dim">Add a course, then its deadlines and exams. See them as an agenda, or as a board with a column for each course.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => setSheet({ type: 'course' })}>
            <Plus size={14} aria-hidden="true" /> Add a course
          </Button>
          {isDemo() && (
            <Button variant="ghost" size="sm" onClick={addSample}>
              <Sparkles size={14} aria-hidden="true" /> Try a sample course
            </Button>
          )}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2" data-overview-stats>
        <Stat value={summary.overdue} label="Overdue" tone={summary.overdue ? 'text-danger' : 'text-bone'} />
        <Stat value={summary.today} label="Today" tone={summary.today ? 'text-signal' : 'text-bone'} />
        <Stat value={summary.week} label="This week" />
        <Stat value={summary.cardsDue} label="Cards due" tone={summary.cardsDue ? 'text-signal' : 'text-bone'} onClick={() => onTab('cards')} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={view} onChange={setView} options={VIEWS} label="View" />
        <div className="flex gap-2 max-md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setSheet({ type: 'course' })}>
            <Plus size={14} aria-hidden="true" /> Course
          </Button>
          <Button size="sm" onClick={() => addItem()} disabled={!hasCourses} data-add-item>
            <Plus size={14} aria-hidden="true" /> Deadline or exam
          </Button>
        </div>
      </div>

      {view === 'agenda' ? <AgendaView list={list} now={now} onOpen={openItem} /> : <BoardView list={list} now={now} onOpen={openItem} onAdd={addItem} onEditCourse={(course) => setSheet({ type: 'course', course })} onNewCourse={() => setSheet({ type: 'course' })} onMove={move} />}

      {sheet?.type === 'item' && <ItemSheet key={sheet.item?.id ?? 'new'} item={sheet.item} courseId={sheet.courseId} courseList={list} onClose={() => setSheet(null)} />}
      {sheet?.type === 'course' && <CourseSheet key={sheet.course?.id ?? 'new'} course={sheet.course} count={list.length} onClose={() => setSheet(null)} />}
    </div>
  );
}
