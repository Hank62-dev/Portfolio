import { useEffect, useMemo, useState } from 'react';
import { Apple, Bike, BookOpen, Brain, Check, ChevronDown, Coffee, Droplets, Dumbbell, Flame, Footprints, Moon, Music2, Pencil, PenLine, Plus, Sparkles, Sprout, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, Input } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead } from '../components/Page';
import { HABIT_ICONS, dayKey, gardenLine, gardenWeek, heatmap, longestStreak, moodLift, newHabit, nextStage, rate, stageOf, stageProgress, streak, todoFirst, toggleDay, weekStrip } from '../habits/model';
import { habits, sampleHabits } from '../habits/store';
import { loadNotes, notesStore } from '../notes/library';
import { useFab } from '../fab';
import { useStore } from '../store';

// each habit picks one of these; they are drawn with the icon library, never as emoji
const ICONS = { sprout: Sprout, book: BookOpen, run: Dumbbell, water: Droplets, mind: Brain, write: PenLine, music: Music2, sleep: Moon, walk: Footprints, eat: Apple, ride: Bike, coffee: Coffee };
const ICON_LABEL = { sprout: 'Grow', book: 'Read', run: 'Move', water: 'Drink', mind: 'Think', write: 'Write', music: 'Play', sleep: 'Rest', walk: 'Walk', eat: 'Eat well', ride: 'Ride', coffee: 'Pause' };
const COLOURS = [
  { hue: 140, label: 'Green' },
  { hue: 175, label: 'Teal' },
  { hue: 210, label: 'Blue' },
  { hue: 265, label: 'Violet' },
  { hue: 330, label: 'Pink' },
  { hue: 30, label: 'Orange' },
];
const SAVED_HUE = (habit) => COLOURS.find((c) => c.hue === habit?.hue)?.hue ?? COLOURS[0].hue;

/** A plant that grows with the streak: the stem gets taller, then leaves, then a flower, then a tree. */
function Plant({ stage, wilting, hue, className }) {
  const c = `hsl(${hue} 70% 55%)`;
  const dark = `hsl(${hue} 60% 38%)`;
  const lean = wilting ? 14 : 0;
  return (
    <svg viewBox="0 0 100 110" className={clsx('origin-bottom', className, !wilting && 'animate-[sway_5s_ease-in-out_infinite]')} role="img" aria-label={`A ${['seed', 'sprout', 'seedling', 'plant', 'plant in bloom', 'tree'][stage]}${wilting ? ', wilting' : ''}`} style={{ filter: wilting ? 'saturate(0.35)' : undefined }}>
      <ellipse cx="50" cy="104" rx="26" ry="5" fill="rgb(0 0 0 / 0.35)" />
      <path d="M22 98 Q50 108 78 98 L72 86 Q50 92 28 86 Z" fill="#3a2a22" />
      <g transform={`rotate(${lean} 50 88)`}>
        {stage === 0 && <ellipse cx="50" cy="84" rx="5" ry="3.5" fill="#7a5a3c" />}
        {stage >= 1 && <path d="M50 88 Q50 72 50 60" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />}
        {stage === 1 && <path d="M50 62 Q40 54 36 60 Q44 66 50 62 M50 62 Q60 54 64 60 Q56 66 50 62" fill={c} />}
        {stage >= 2 && <path d="M50 88 Q50 50 50 38" stroke={dark} strokeWidth="3.4" strokeLinecap="round" fill="none" />}
        {stage >= 2 && <path d="M50 74 Q34 66 30 74 Q42 80 50 74 M50 62 Q66 52 72 60 Q58 68 50 62 M50 50 Q36 42 32 48 Q44 56 50 50" fill={c} />}
        {stage >= 3 && <path d="M50 40 Q38 28 44 20 Q52 28 50 40 M50 40 Q62 28 56 20 Q48 28 50 40" fill={c} />}
        {stage >= 4 && (
          <g>
            <circle cx="50" cy="26" r="9" fill="#ffd2bd" />
            <circle cx="50" cy="26" r="4" fill="#ff5b2e" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="50" cy="14" rx="4" ry="7" fill="#ff8a5c" transform={`rotate(${a} 50 26)`} />
            ))}
          </g>
        )}
        {stage >= 5 && (
          <g fill={dark} opacity="0.9">
            <circle cx="34" cy="48" r="11" />
            <circle cx="66" cy="46" r="12" />
            <circle cx="50" cy="38" r="13" />
          </g>
        )}
      </g>
    </svg>
  );
}

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
    <div className="relative size-24 shrink-0" role="img" aria-label={`${done} of ${total} habits done today`}>
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
    <section className="rounded-[1.75rem] border border-line bg-[radial-gradient(80%_120%_at_0%_0%,rgb(61_220_151/0.10),transparent_60%),var(--color-ink-1)] p-5 max-md:p-4" aria-label="Today" data-garden-today>
      <div className="flex items-center gap-4">
        <Ring done={done} total={items.length} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Today</p>
          <p className="mt-1 font-display text-lead leading-snug text-bone">{gardenLine(done, items.length)}</p>
          {items.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-bone-dim">
              <span className="inline-flex items-center gap-1">
                <Flame size={13} className={best ? 'text-signal' : 'text-bone-faint'} aria-hidden="true" /> Best streak <b className="text-bone">{best}</b>
              </span>
              <span>
                Plants <b className="text-bone">{items.length}</b>
              </span>
            </p>
          )}
        </div>
      </div>
      {items.length > 0 && (
        <ol className="mt-4 grid grid-cols-7 gap-1.5 border-t border-line pt-4" aria-label="The last seven days">
          {week.map((d) => {
            const share = d.total ? d.done / d.total : 0;
            return (
              <li key={d.day} className="flex flex-col items-center gap-1.5" title={`${d.day}: ${d.done} of ${d.total}`}>
                <span className="relative h-10 w-full max-w-9 overflow-hidden rounded-xl bg-white/[0.06]">
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
    <div className="flex gap-[3px] overflow-hidden" role="img" aria-label="The last 20 weeks">
      {weeks.map((week, i) => (
        <div key={i} className={clsx('flex flex-col gap-[3px]', i < weeks.length - 13 && 'max-md:hidden')}>
          {week.map((cell) => (
            <i key={cell.day} title={cell.day} className={clsx('block size-[10px] rounded-[3px]', cell.future ? 'opacity-0' : cell.done ? '' : 'bg-white/8')} style={cell.done ? { background: `hsl(${hue} 70% 58%)` } : undefined} />
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
          aria-label={`${habit.name}: ${done ? 'done today' : 'mark done today'}`}
          onClick={() => {
            navigator.vibrate?.(done ? 4 : 10);
            set(today);
          }}
          className={clsx('grid size-12 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90', done ? 'text-ink-0' : 'text-transparent hover:text-bone-faint')}
          style={done ? { background: tint, borderColor: tint } : { borderColor: `hsl(${habit.hue} 60% 50% / 0.55)` }}
        >
          <Check size={22} strokeWidth={3} aria-hidden="true" />
        </button>

        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`${habit.name}: ${open ? 'hide' : 'show'} details`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0 flex-1 leading-tight">
            <span className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: `hsl(${habit.hue} 60% 50% / 0.2)`, color: `hsl(${habit.hue} 85% 76%)` }}>
                <HabitIcon id={habit.icon} size={13} />
              </span>
              <b className={clsx('truncate font-display text-lead', done ? 'text-bone-dim' : 'text-bone')}>{habit.name}</b>
            </span>
            <small className="mt-1 block truncate font-mono text-[0.7rem] text-bone-faint">
              {wilting ? 'Needs water' : run ? `${run}-day streak` : 'Not started'}
            </small>
          </span>
          <Plant stage={stage} wilting={wilting} hue={habit.hue} className="h-14 w-12 shrink-0" />
          <ChevronDown size={16} className={clsx('shrink-0 text-bone-faint transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 px-3.5 pb-3.5 max-md:px-3 max-md:pb-3" role="group" aria-label={`${habit.name}: the last seven days`}>
        {week.map((d) => (
          <button
            key={d.day}
            type="button"
            role="checkbox"
            aria-checked={d.done}
            aria-label={`${habit.name} on ${d.day}${d.isToday ? ' (today)' : ''}`}
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
        <div className="flex flex-col gap-4 border-t border-line bg-black/15 p-4 max-md:p-3.5" data-habit-details>
          {next && (
            <div>
              <div className="mb-1.5 flex justify-between font-mono text-[0.68rem] text-bone-faint">
                <span className="capitalize">{name}</span>
                <span>
                  {next.left} more {next.left === 1 ? 'day' : 'days'} to {next.name}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Growth to the next stage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stageProgress(run) * 100)}>
                <i className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(stageProgress(run) * 100)}%`, background: tint }} />
              </div>
            </div>
          )}
          <Heat days={habit.days} hue={habit.hue} />
          <div className="flex flex-wrap gap-1.5">
            <Badge>{rate(habit.days)}% of 30 days</Badge>
            <Badge>
              <Flame size={11} aria-hidden="true" /> best {longestStreak(habit.days)}
            </Badge>
            <Badge>{habit.days.length} in all</Badge>
            {lift !== null && (
              <Badge tone={lift >= 0 ? 'ok' : 'warn'}>
                mood {lift >= 0 ? '+' : ''}
                {lift} on these days
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(habit)}>
              <Pencil size={14} aria-hidden="true" /> Edit
            </Button>
            {sure ? (
              <Button variant="danger" size="sm" onClick={() => habits.remove(habit.id)} onBlur={() => setSure(false)} autoFocus>
                <Trash2 size={14} aria-hidden="true" /> Tap again to delete
              </Button>
            ) : (
              <Button variant="ghost" size="sm" aria-label={`Delete ${habit.name}`} onClick={() => setSure(true)}>
                <Trash2 size={14} aria-hidden="true" /> Delete
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
      eyebrow={editing ? 'EDIT HABIT' : 'NEW HABIT'}
      title={editing ? 'Change this habit' : 'Plant a habit'}
      description="Choose a name, an icon and a colour for the plant."
    >
      <form onSubmit={save} className="flex flex-col gap-5" data-habit-form>
        <Input aria-label="Habit name" placeholder="e.g. Read 20 minutes" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Icon</legend>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Icon">
            {HABIT_ICONS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={icon === id} aria-label={`Icon: ${ICON_LABEL[id]}`} title={ICON_LABEL[id]} onClick={() => setIcon(id)} className={clsx('grid aspect-square place-items-center rounded-2xl transition-all active:scale-90', icon === id ? 'bg-signal text-ink-0' : 'bg-white/[0.05] text-bone-dim hover:bg-white/10 hover:text-bone')}>
                <HabitIcon id={id} size={18} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Colour</legend>
          <div className="flex gap-2.5" role="radiogroup" aria-label="Colour">
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
              <Check size={15} aria-hidden="true" /> Save
            </>
          ) : (
            <>
              <Sprout size={15} aria-hidden="true" /> Plant it
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
  useFab({ label: 'Plant a habit', icon: Plus, onPress: () => setEditing({}) });

  useEffect(() => {
    void habits.load();
    void loadNotes();
  }, []);

  const mood = useMemo(() => Object.fromEntries(notes.filter((n) => n.day && n.mood).map((n) => [n.day, n.mood])), [notes]);
  const ordered = useMemo(() => todoFirst(items), [items]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHead eyebrow="Life" title="Habit" accent="Garden." description="Every habit is a plant. Water it on the days you do it and it grows; leave it too long and it droops.">
        {items.some((h) => h.sample) && (
          <Button variant="ghost" size="sm" onClick={() => Promise.all(items.filter((h) => h.sample).map((h) => habits.remove(h.id)))}>
            Remove samples
          </Button>
        )}
        <Button size="sm" onClick={() => setEditing({})} className="max-md:hidden">
          <Plus size={15} aria-hidden="true" /> Plant a habit
        </Button>
      </PageHead>

      {loaded && items.length === 0 ? (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-line-strong p-6">
          <div className="min-w-[min(100%,15rem)] flex-1">
            <h2 className="font-display text-lead text-bone">The garden is empty</h2>
            <p className="text-fine text-bone-dim">Plant your first habit, or look at a garden that has been growing for a while.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus size={14} aria-hidden="true" /> Plant a habit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => habits.putMany(sampleHabits())}>
              <Sparkles size={14} aria-hidden="true" /> Try a sample garden
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Today items={items} />
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2" aria-label="Habits">
            {ordered.map((h) => (
              <HabitRow key={h.id} habit={h} mood={mood} onEdit={setEditing} />
            ))}
          </ul>
        </>
      )}

      <p className="px-1 text-[0.8rem] leading-relaxed text-bone-faint">Plants grow at 1, 3, 7, 14 and 30 days in a row. Tap any of the last seven days to fill one in or take it out. Mood comes from your journal: once a habit has a few days with and without it, you will see what it does for you.</p>

      {editing && <HabitDialog key={editing.id ?? 'new'} habit={editing} count={items.length} onClose={() => setEditing(null)} />}
    </div>
  );
}
