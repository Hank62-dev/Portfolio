import { useEffect, useMemo, useState } from 'react';
import { Apple, Bike, BookOpen, Brain, Check, ChevronDown, Coffee, Droplets, Dumbbell, Flame, Footprints, Moon, Music2, Pencil, PenLine, Plus, Sparkles, Sprout, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, Input } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead } from '../components/Page';
import { HABIT_ICONS, dayKey, gardenLine, gardenWeek, heatmap, longestStreak, moodLift, newHabit, nextStage, rate, stageOf, stageProgress, streak, todoFirst, toggleDay, weekStrip } from '../habits/model';
import Garden from '../habits/Garden';
import Plant from '../habits/Plant';
import { habits, sampleHabits } from '../habits/store';
import { loadNotes, notesStore } from '../notes/library';
import { useFab } from '../fab';
import { useStore } from '../store';
import { isDemo } from '../demo/mode';
import { tr } from '../lang';

// each habit picks one of these; they are drawn with the icon library, never as emoji
const ICONS = { sprout: Sprout, book: BookOpen, run: Dumbbell, water: Droplets, mind: Brain, write: PenLine, music: Music2, sleep: Moon, walk: Footprints, eat: Apple, ride: Bike, coffee: Coffee };
const ICON_LABEL = { sprout: 'Grow', book: 'Read', run: 'Move', water: 'Drink', mind: 'Think', write: 'Write', music: 'Play', sleep: 'Rest', walk: 'Walk', eat: 'Eat well', ride: 'Ride', coffee: 'Pause' };
const COLOURS = [
  { hue: 140, label: tr('Green') },
  { hue: 175, label: tr('Teal') },
  { hue: 210, label: tr('Blue') },
  { hue: 265, label: tr('Violet') },
  { hue: 330, label: tr('Pink') },
  { hue: 30, label: tr('Orange') },
];
const SAVED_HUE = (habit) => COLOURS.find((c) => c.hue === habit?.hue)?.hue ?? COLOURS[0].hue;

function HabitIcon({ id, size = 16 }) {
  const Icon = ICONS[id] ?? Sprout;
  return <Icon size={size} aria-hidden="true" />;
}

/** A ring that fills as the day's habits are done. */
function Ring({ done, total }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const share = total ? done / total : 0;
  const finished = total > 0 && done === total;
  return (
    <div className="relative size-24 shrink-0" role="img" aria-label={tr('{0} of {1} habits done today', done, total)}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={finished ? 'var(--color-ok)' : 'var(--color-signal)'} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - share)} className="transition-[stroke-dashoffset] duration-500" />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <b className={clsx('font-display text-[1.7rem] leading-none tabular-nums', finished ? 'text-ok' : 'text-bone')}>
          {done}
          <small className="text-[0.95rem] text-bone-faint">/{total}</small>
        </b>
      </span>
    </div>
  );
}

/** The top of the page: how today is going, and the last seven days of the whole garden. */
function Today({ items }) {
  const key = dayKey();
  const done = items.filter((h) => h.days.includes(key)).length;
  const week = useMemo(() => gardenWeek(items), [items]);
  const best = Math.max(0, ...items.map((h) => streak(h.days)));
  return (
    <section className="ink-panel rounded-[1.75rem] p-5 max-md:p-4" aria-label={tr('Today')} data-garden-today>
      <div className="flex items-center gap-4">
        <Ring done={done} total={items.length} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Today')}</p>
          <p className="mt-1 font-display text-lead leading-snug text-bone">{gardenLine(done, items.length)}</p>
          {items.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-bone-dim">
              <span className="inline-flex items-center gap-1">
                <Flame size={13} className={best ? 'text-signal' : 'text-bone-faint'} aria-hidden="true" /> {tr('Best streak')} <b className="text-bone">{best}</b>
              </span>
              <span>
                {tr('Plants')} <b className="text-bone">{items.length}</b>
              </span>
            </p>
          )}
        </div>
      </div>
      {items.length > 0 && (
        <ol className="mt-4 grid grid-cols-7 gap-1.5 border-t border-line pt-4" aria-label={tr('The last seven days')}>
          {week.map((d) => {
            const share = d.total ? d.done / d.total : 0;
            return (
              <li key={d.day} className="flex flex-col items-center gap-1.5" title={tr('{0}: {1} of {2}', d.day, d.done, d.total)}>
                <span className="relative h-10 w-full max-w-9 overflow-hidden rounded-xl bg-wash/[0.06]">
                  <i className={clsx('absolute inset-x-0 bottom-0 block transition-[height] duration-500', share === 1 ? 'bg-ok' : 'bg-signal/80')} style={{ height: `${Math.round(share * 100)}%` }} />
                </span>
                <span className={clsx('font-mono text-[0.66rem]', d.isToday ? 'text-signal' : 'text-bone-faint')}>{d.label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Heat({ days, hue }) {
  const weeks = useMemo(() => heatmap(days, 20), [days]);
  return (
    <div className="flex gap-[3px] overflow-hidden" role="img" aria-label={tr('The last 20 weeks')}>
      {weeks.map((week, i) => (
        <div key={i} className={clsx('flex flex-col gap-[3px]', i < weeks.length - 13 && 'max-md:hidden')}>
          {week.map((cell) => (
            <i key={cell.day} title={cell.day} className={clsx('block size-[10px] rounded-[3px]', cell.future ? 'opacity-0' : cell.done ? '' : 'bg-wash/8')} style={cell.done ? { background: `hsl(${hue} 70% 58%)` } : undefined} />
          ))}
        </div>
      ))}
    </div>
  );
}

function HabitRow({ habit, mood, onEdit }) {
  const today = dayKey();
  const done = habit.days.includes(today);
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const { stage, name, wilting, streak: run } = stageOf(habit.days);
  const next = nextStage(run);
  const lift = moodLift(habit.days, mood);
  const week = weekStrip(habit.days);
  const tint = `hsl(${habit.hue} 70% 58%)`;
  const set = (day) => habits.update(habit.id, { days: toggleDay(habit.days, day) });

  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-ink-1" data-habit={habit.name}>
      <div className="flex items-center gap-3 p-3.5 max-md:gap-2.5 max-md:p-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${habit.name}: ${done ? tr('done today') : tr('mark done today')}`}
          onClick={() => {
            navigator.vibrate?.(done ? 4 : 10);
            set(today);
          }}
          className={clsx('grid size-12 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90', done ? 'text-ink-0' : 'text-transparent hover:text-bone-faint')}
          style={done ? { background: tint, borderColor: tint } : { borderColor: `hsl(${habit.hue} 60% 50% / 0.55)` }}
        >
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </button>

        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={tr('{0}: {1} details', habit.name, open ? tr('hide') : tr('show'))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0 flex-1 leading-tight">
            <span className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: `hsl(${habit.hue} 60% 50% / 0.2)`, color: `hsl(${habit.hue} 85% 76%)` }}>
                <HabitIcon id={habit.icon} size={13} />
              </span>
              <b className={clsx('truncate font-display text-lead', done ? 'text-bone-dim' : 'text-bone')}>{habit.name}</b>
            </span>
            <small className="mt-1 block truncate font-mono text-[0.7rem] text-bone-faint">
              {wilting ? tr('Needs water') : run ? tr('{0}-day streak', run) : tr('Not started')}
            </small>
          </span>
          <Plant stage={stage} wilting={wilting} hue={habit.hue} className="h-14 w-12 shrink-0" />
          <ChevronDown size={16} className={clsx('shrink-0 text-bone-faint transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 px-3.5 pb-3.5 max-md:px-3 max-md:pb-3" role="group" aria-label={tr('{0}: the last seven days', habit.name)}>
        {week.map((d) => (
          <button
            key={d.day}
            type="button"
            role="checkbox"
            aria-checked={d.done}
            aria-label={tr('{0} on {1}{2}', habit.name, d.day, d.isToday ? tr(' (today)') : '')}
            onClick={() => set(d.day)}
            className="flex flex-1 flex-col items-center gap-1 py-1 active:scale-90"
          >
            <span className={clsx('grid size-8 place-items-center rounded-full border text-ink-0 transition-colors', d.done ? 'border-transparent' : d.isToday ? 'border-line-strong' : 'border-line')} style={d.done ? { background: tint } : undefined}>
              {d.done && <Check size={14} strokeWidth={3} aria-hidden="true" />}
            </span>
            <span className={clsx('font-mono text-[0.62rem]', d.isToday ? 'text-signal' : 'text-bone-faint')}>{d.label}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-line bg-shade/15 p-4 max-md:p-3.5" data-habit-details>
          {next && (
            <div>
              <div className="mb-1.5 flex justify-between font-mono text-[0.68rem] text-bone-faint">
                <span className="capitalize">{name}</span>
                <span>
                  {next.left} {tr('more')} {next.left === 1 ? tr('day') : tr('days')} {tr('to')} {next.name}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-wash/10" role="progressbar" aria-label={tr('Growth to the next stage')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stageProgress(run) * 100)}>
                <i className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(stageProgress(run) * 100)}%`, background: tint }} />
              </div>
            </div>
          )}
          <Heat days={habit.days} hue={habit.hue} />
          <div className="flex flex-wrap gap-1.5">
            <Badge>{rate(habit.days)}{tr('% of 30 days')}</Badge>
            <Badge>
              <Flame size={11} aria-hidden="true" /> {tr('best')} {longestStreak(habit.days)}
            </Badge>
            <Badge>{habit.days.length} {tr('in all')}</Badge>
            {lift !== null && (
              <Badge tone={lift >= 0 ? 'ok' : 'warn'}>
                {tr('mood')} {lift >= 0 ? '+' : ''}
                {lift} {tr('on these days')}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(habit)}>
              <Pencil size={14} aria-hidden="true" /> {tr('Edit')}
            </Button>
            {sure ? (
              <Button variant="danger" size="sm" onClick={() => habits.remove(habit.id)} onBlur={() => setSure(false)} autoFocus>
                <Trash2 size={14} aria-hidden="true" /> {tr('Tap again to delete')}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" aria-label={tr('Delete {0}', habit.name)} onClick={() => setSure(true)}>
                <Trash2 size={14} aria-hidden="true" /> {tr('Delete')}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** Planting a new habit, or changing one: a name, an icon and a colour. On a phone it is a sheet that can be pulled down. */
function HabitDialog({ habit, onClose, count }) {
  const editing = Boolean(habit?.id);
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? HABIT_ICONS[0]);
  const [hue, setHue] = useState(habit ? SAVED_HUE(habit) : COLOURS[count % COLOURS.length].hue);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) await habits.update(habit.id, { name: name.trim().slice(0, 40), icon, hue });
    else await habits.create(newHabit(name, icon, hue));
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      eyebrow={editing ? tr('EDIT HABIT') : tr('NEW HABIT')}
      title={editing ? tr('Change this habit') : tr('Plant a habit')}
      description={tr('Choose a name, an icon and a colour for the plant.')}
    >
      <form onSubmit={save} className="flex flex-col gap-5" data-habit-form>
        <Input aria-label={tr('Habit name')} placeholder={tr('e.g. Read 20 minutes')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Icon')}</legend>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={tr('Icon')}>
            {HABIT_ICONS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={icon === id} aria-label={tr('Icon: {0}', ICON_LABEL[id])} title={ICON_LABEL[id]} onClick={() => setIcon(id)} className={clsx('grid aspect-square place-items-center rounded-2xl transition-all active:scale-90', icon === id ? 'bg-signal text-ink-0' : 'bg-wash/[0.05] text-bone-dim hover:bg-wash/10 hover:text-bone')}>
                <HabitIcon id={id} size={18} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Colour')}</legend>
          <div className="flex gap-2.5" role="radiogroup" aria-label={tr('Colour')}>
            {COLOURS.map((c) => (
              <button key={c.hue} type="button" role="radio" aria-checked={hue === c.hue} aria-label={c.label} title={c.label} onClick={() => setHue(c.hue)} className={clsx('grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-ink-1 transition-all active:scale-90', hue === c.hue && 'ring-2 ring-bone')} style={{ background: `hsl(${c.hue} 70% 55%)` }}>
                {hue === c.hue && <Check size={15} strokeWidth={3} className="text-ink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={!name.trim()} className="w-full justify-center">
          {editing ? (
            <>
              <Check size={15} aria-hidden="true" /> {tr('Save')}
            </>
          ) : (
            <>
              <Sprout size={15} aria-hidden="true" /> {tr('Plant it')}
            </>
          )}
        </Button>
      </form>
    </Dialog>
  );
}

export default function HabitsView() {
  const { loaded, items } = useStore(habits.store);
  const { notes } = useStore(notesStore);
  const [editing, setEditing] = useState(null); // null: closed, {}: a new habit, or the habit being changed
  useFab({ label: tr('Plant a habit'), icon: Plus, onPress: () => setEditing({}) });

  useEffect(() => {
    void habits.load();
    void loadNotes();
  }, []);

  const mood = useMemo(() => Object.fromEntries(notes.filter((n) => n.day && n.mood).map((n) => [n.day, n.mood])), [notes]);
  const ordered = useMemo(() => todoFirst(items), [items]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHead eyebrow={tr('Life')} title={tr('Habit')} accent="Garden." description={tr('Every habit is a plant. Water it on the days you do it and it grows; leave it too long and it droops.')}>
        {items.some((h) => h.sample) && (
          <Button variant="ghost" size="sm" onClick={() => Promise.all(items.filter((h) => h.sample).map((h) => habits.remove(h.id)))}>
            {tr('Remove samples')}
          </Button>
        )}
        <Button size="sm" onClick={() => setEditing({})} className="max-md:hidden">
          <Plus size={15} aria-hidden="true" /> {tr('Plant a habit')}
        </Button>
      </PageHead>

      {loaded && items.length === 0 ? (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-line-strong p-6">
          <div className="min-w-[min(100%,15rem)] flex-1">
            <h2 className="font-display text-lead text-bone">{tr('The garden is empty')}</h2>
            <p className="text-fine text-bone-dim">{tr('Plant your first habit.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus size={14} aria-hidden="true" /> {tr('Plant a habit')}
            </Button>
            {isDemo() && (
              <Button variant="ghost" size="sm" onClick={() => habits.putMany(sampleHabits())}>
                <Sparkles size={14} aria-hidden="true" /> {tr('Try a sample garden')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <Garden items={items} />
          <Today items={items} />
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2" aria-label={tr('Habits')}>
            {ordered.map((h) => (
              <HabitRow key={h.id} habit={h} mood={mood} onEdit={setEditing} />
            ))}
          </ul>
        </>
      )}

      <p className="px-1 text-[0.8rem] leading-relaxed text-bone-faint">{tr('Plants grow at 1, 3, 7, 14 and 30 days in a row. Tap any of the last seven days to fill one in or take it out. Mood comes from your journal: once a habit has a few days with and without it, you will see what it does for you.')}</p>

      {editing && <HabitDialog key={editing.id ?? 'new'} habit={editing} count={items.length} onClose={() => setEditing(null)} />}
    </div>
  );
}
