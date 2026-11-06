import { useState } from 'react';
import { BookOpenCheck, Check, CalendarClock, Plus, Trash2, X } from 'lucide-react';
import { Button, DatePicker, Dialog, Input, Select } from '../../../../design-system';
import { clsx } from '../../../../lib/format';
import { Segmented } from '../../components/Page';
import { courses, flashcards } from '../store';
import { PRIORITIES, atOfInput, deleteItem, inputOfAt, newItem, newStep, saveItem } from '../planner';
import { tr } from '../../lang';

export const COLOURS = [265, 210, 175, 140, 30, 330, 55].map((hue) => ({ hue }));

const applyAll = (updates) => Promise.all(updates.map((u) => courses.update(u.id, u.patch)));

/**
 * One exam or deadline: its title, kind, course, date, priority and a checklist of small steps. On a phone it is a sheet that
 * can be pulled down. Changing the course moves the item there.
 */
export function ItemSheet({ item, kind: startKind = 'deadline', courseId: startCourse, courseList, onClose }) {
  const editing = Boolean(item?.id);
  const [title, setTitle] = useState(item?.title ?? '');
  const [kind, setKind] = useState(item ? (item.kind ?? startKind) : startKind);
  const [courseId, setCourseId] = useState(item?.course?.id ?? startCourse ?? courseList[0]?.id ?? '');
  const [date, setDate] = useState(item ? inputOfAt(item.at) : '');
  const [priority, setPriority] = useState(item?.priority ?? 'normal');
  const [steps, setSteps] = useState(item?.steps ?? []);
  const [done, setDone] = useState(Boolean(item?.done));
  const [step, setStep] = useState('');
  const [sure, setSure] = useState(false);
  const ready = title.trim() && date && courseId;

  const addStep = () => {
    if (!step.trim()) return;
    setSteps((list) => [...list, newStep(step)]);
    setStep('');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!ready) return;
    const base = editing ? { id: item.id, title: title.trim().slice(0, 80), at: atOfInput(date), priority, steps } : newItem({ title, at: atOfInput(date), kind, priority });
    const next = { ...base, steps, ...(kind === 'deadline' ? { done } : {}) };
    await applyAll(saveItem(courseList, next, { kind, courseId }));
    onClose();
  };

  const remove = async () => {
    await applyAll(deleteItem(courseList, item.id));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={editing ? tr('EDIT') : tr('NEW')} title={editing ? tr('Change this') : tr('Add a deadline or exam')} description={tr('Choose the course, the date and how important it is. Break it into small steps if it is big.')}>
      <form onSubmit={save} className="flex flex-col gap-4" data-item-form>
        <Input aria-label={tr('What is it?')} placeholder={tr('e.g. Lab 3: normalisation')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label={tr('Type')}
            value={kind}
            onChange={setKind}
            options={[
              { id: 'deadline', label: tr('Deadline'), icon: CalendarClock },
              { id: 'exam', label: tr('Exam'), icon: BookOpenCheck },
            ]}
          />
          <Segmented label={tr('Priority')} value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ id: p.id, label: p.label }))} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select aria-label={tr('Course')} value={courseId} onChange={(e) => setCourseId(e.target.value)} compact>
            {courseList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <DatePicker aria-label={tr('Date')} value={date} onChange={setDate} compact clearable={false} className="w-full" />
        </div>

        {kind === 'deadline' && editing && (
          <button type="button" role="checkbox" aria-checked={done} onClick={() => setDone((v) => !v)} className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3 text-left text-fine text-bone-dim">
            <span className={clsx('grid size-5 shrink-0 place-items-center rounded-md border', done ? 'border-ok bg-ok text-ink-0' : 'border-line-strong')}>{done && <Check size={13} strokeWidth={3} aria-hidden="true" />}</span>
            {tr('Mark as done')}
          </button>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Steps')}</legend>
          {steps.length > 0 && (
            <ul className="flex flex-col gap-1">
              {steps.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1">
                  <button type="button" role="checkbox" aria-checked={s.done} aria-label={tr('Step done: {0}', s.text)} onClick={() => setSteps(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} className={clsx('grid size-5 shrink-0 place-items-center rounded-md border', s.done ? 'border-signal bg-signal text-ink-0' : 'border-line-strong')}>
                    {s.done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                  </button>
                  <span className={clsx('min-w-0 flex-1 text-fine', s.done ? 'text-bone-faint line-through' : 'text-bone-dim')}>{s.text}</span>
                  <button type="button" aria-label={tr('Remove step: {0}', s.text)} onClick={() => setSteps(steps.filter((x) => x.id !== s.id))} className="p-1 text-bone-faint hover:text-danger">
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              aria-label={tr('New step')}
              placeholder={tr('Add a step')}
              value={step}
              onChange={(e) => setStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStep();
                }
              }}
              compact
              className="min-w-0 flex-1"
            />
            <Button type="button" variant="ghost" size="icon" aria-label={tr('Add the step')} onClick={addStep} disabled={!step.trim()}>
              <Plus size={16} aria-hidden="true" />
            </Button>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={!ready} className="w-full justify-center" data-save-item>
            <Check size={15} aria-hidden="true" /> {editing ? tr('Save') : tr('Add')}
          </Button>
          {editing &&
            (sure ? (
              <Button type="button" variant="danger" className="w-full justify-center" onClick={remove} onBlur={() => setSure(false)} autoFocus>
                <Trash2 size={15} aria-hidden="true" /> {tr('Tap again to delete')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => setSure(true)} data-delete-item>
                <Trash2 size={15} aria-hidden="true" /> {tr('Delete')}
              </Button>
            ))}
        </div>
      </form>
    </Dialog>
  );
}

/** A course: its name, code and colour. Deleting it keeps its flashcards, moving them to the General deck. */
export function CourseSheet({ course, count, onClose }) {
  const editing = Boolean(course?.id);
  const [name, setName] = useState(course?.name ?? '');
  const [code, setCode] = useState(course?.code ?? '');
  const [hue, setHue] = useState(course?.hue ?? COLOURS[count % COLOURS.length].hue);
  const [sure, setSure] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const fields = { name: name.trim().slice(0, 60), code: code.trim().slice(0, 12).toUpperCase(), hue };
    if (editing) await courses.update(course.id, fields);
    else await courses.create({ ...fields, exams: [], deadlines: [] });
    onClose();
  };

  const remove = async () => {
    const cards = flashcards.store.get().items.filter((c) => c.deck === course.id);
    await Promise.all(cards.map((c) => flashcards.update(c.id, { deck: '' })));
    await courses.remove(course.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={editing ? tr('EDIT COURSE') : tr('NEW COURSE')} title={editing ? tr('Change this course') : tr('Add a course')} description={tr('A course holds its deadlines, exams and flashcard deck.')}>
      <form onSubmit={save} className="flex flex-col gap-4" data-course-form>
        <Input aria-label={tr('Course name')} placeholder={tr('e.g. Database Systems')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        <Input aria-label={tr('Course code')} placeholder={tr('Code (optional), e.g. DBI202')} value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} compact />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Colour')}</legend>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={tr('Colour')}>
            {COLOURS.map((c) => (
              <button key={c.hue} type="button" role="radio" aria-checked={hue === c.hue} aria-label={tr('Colour {0}', c.hue)} onClick={() => setHue(c.hue)} className={clsx('grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-ink-1 transition-all active:scale-90', hue === c.hue && 'ring-2 ring-bone')} style={{ background: `hsl(${c.hue} 70% 58%)` }}>
                {hue === c.hue && <Check size={15} strokeWidth={3} className="text-ink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={!name.trim()} className="w-full justify-center">
            <Check size={15} aria-hidden="true" /> {editing ? tr('Save') : tr('Add course')}
          </Button>
          {editing &&
            (sure ? (
              <Button type="button" variant="danger" className="w-full justify-center" onClick={remove} onBlur={() => setSure(false)} autoFocus>
                <Trash2 size={15} aria-hidden="true" /> {tr('Tap again to delete the course')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => setSure(true)} data-delete-course>
                <Trash2 size={15} aria-hidden="true" /> {tr('Delete course')}
              </Button>
            ))}
        </div>
      </form>
    </Dialog>
  );
}

