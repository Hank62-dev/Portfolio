import { useEffect, useMemo, useState } from 'react';
import { Apple, Bike, BookOpen, Brain, Check, Coffee, Droplets, Dumbbell, Flame, Footprints, Moon, Music2, PenLine, Plus, Sparkles, Sprout, Trash2, X } from 'lucide-react';
import { Badge, Button, Input } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { Figure, PageHead, Tile } from '../components/Page';
import { HABIT_ICONS, dayKey, heatmap, longestStreak, moodLift, newHabit, rate, stageOf, streak, toggleDay } from '../habits/model';
import { habits, sampleHabits } from '../habits/store';
import { loadNotes, notesStore } from '../notes/library';
import { useFab } from '../fab';
import { useStore } from '../store';

// each habit picks one of these; they are drawn with the icon library, never as emoji
const ICONS = { sprout: Sprout, book: BookOpen, run: Dumbbell, water: Droplets, mind: Brain, write: PenLine, music: Music2, sleep: Moon, walk: Footprints, eat: Apple, ride: Bike, coffee: Coffee };
const ICON_LABEL = { sprout: 'Grow', book: 'Read', run: 'Move', water: 'Drink', mind: 'Think', write: 'Write', music: 'Play', sleep: 'Rest', walk: 'Walk', eat: 'Eat well', ride: 'Ride', coffee: 'Pause' };

/** A plant that grows with the streak: the stem gets taller, then leaves, then a flower, then a tree. */
function Plant({ stage, wilting, hue }) {
  const c = `hsl(${hue} 70% 55%)`;
  const dark = `hsl(${hue} 60% 38%)`;
  const lean = wilting ? 14 : 0;
  return (
    <svg viewBox="0 0 100 110" className={clsx('h-28 w-24 origin-bottom', !wilting && 'animate-[sway_5s_ease-in-out_infinite]')} role="img" aria-label={`A ${['seed', 'sprout', 'seedling', 'plant', 'plant in bloom', 'tree'][stage]}${wilting ? ', wilting' : ''}`} style={{ filter: wilting ? 'saturate(0.35)' : undefined }}>
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

function Heat({ days, hue }) {
  const weeks = useMemo(() => heatmap(days, 20), [days]);
  return (
    <div className="flex gap-[3px]" role="img" aria-label="The last 20 weeks">
      {weeks.map((week, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {week.map((cell) => (
            <i key={cell.day} title={cell.day} className={clsx('block size-[10px] rounded-[3px]', cell.future ? 'opacity-0' : cell.done ? '' : 'bg-white/8')} style={cell.done ? { background: `hsl(${hue} 70% 58%)` } : undefined} />
          ))}
        </div>
      ))}
    </div>
  );
}

function HabitCard({ habit, mood }) {
  const today = dayKey();
  const done = habit.days.includes(today);
  const { stage, name, wilting, streak: run } = stageOf(habit.days);
  const lift = moodLift(habit.days, mood);
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-ink-1 p-5" data-habit={habit.name}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 rounded-2xl bg-[radial-gradient(80%_80%_at_50%_100%,rgb(255_255_255/0.07),transparent)] px-1 pt-2">
          <Plant stage={stage} wilting={wilting} hue={habit.hue} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <h3 className="flex items-center gap-2.5 font-display text-lead text-bone">
            <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ background: `hsl(${habit.hue} 60% 50% / 0.2)`, color: `hsl(${habit.hue} 85% 76%)` }}>
              <HabitIcon id={habit.icon} size={14} />
            </span>
            <span className="truncate">{habit.name}</span>
          </h3>
          <p className="mt-1 font-mono text-[0.72rem] text-bone-faint capitalize">
            {name}
            {wilting ? ' · needs water' : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={run ? 'signal' : 'default'}>
              <Flame size={11} aria-hidden="true" /> {run} day{run === 1 ? '' : 's'}
            </Badge>
            <Badge>{rate(habit.days)}% of 30 days</Badge>
            <Badge>best {longestStreak(habit.days)}</Badge>
          </div>
        </div>
        <button type="button" aria-label={`Delete ${habit.name}`} onClick={() => habits.remove(habit.id)} className="text-bone-faint hover:text-danger">
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      <Heat days={habit.days} hue={habit.hue} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${habit.name}: ${done ? 'done today' : 'mark done today'}`}
          onClick={() => habits.update(habit.id, { days: toggleDay(habit.days, today) })}
          className={clsx('inline-flex h-11 items-center gap-2 rounded-full px-5 font-mono text-fine font-medium transition-all active:scale-95', done ? 'bg-ok/15 text-ok ring-1 ring-ok/40' : 'bg-bone text-ink-0 hover:bg-signal')}
        >
          <Check size={16} strokeWidth={done ? 3 : 2} aria-hidden="true" /> {done ? 'Done today' : 'Water it'}
        </button>
        {lift !== null && (
          <span className="font-mono text-[0.72rem] text-bone-dim">
            Mood {lift >= 0 ? '+' : ''}
            {lift} on the days you do it
          </span>
        )}
      </div>
    </section>
  );
}

export default function HabitsView() {
  const { loaded, items } = useStore(habits.store);
  const { notes } = useStore(notesStore);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [planting, setPlanting] = useState(false); // phones only: the form is hidden until the round button asks for it
  useFab({ label: planting ? 'Close' : 'Plant a habit', icon: planting ? X : Plus, onPress: () => setPlanting((open) => !open) });

  useEffect(() => {
    void habits.load();
    void loadNotes();
  }, []);

  const mood = useMemo(() => Object.fromEntries(notes.filter((n) => n.day && n.mood).map((n) => [n.day, n.mood])), [notes]);
  const today = dayKey();
  const doneToday = items.filter((h) => h.days.includes(today)).length;
  const best = Math.max(0, ...items.map((h) => streak(h.days)));

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await habits.create({ ...newHabit(name, icon, (items.length * 53 + 130) % 360) });
    setName('');
    setPlanting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Life" title="Habit" accent="Garden." description="Every habit is a plant. Water it on the days you do it and it grows; leave it too long and it droops.">
        {items.some((h) => h.sample) && (
          <Button variant="ghost" size="sm" onClick={() => Promise.all(items.filter((h) => h.sample).map((h) => habits.remove(h.id)))}>
            Remove samples
          </Button>
        )}
      </PageHead>

      <div className="grid grid-cols-3 gap-3">
        <Figure value={`${doneToday}/${items.length}`} label="Watered today" tone={items.length && doneToday === items.length ? 'text-ok' : 'text-bone'} />
        <Figure value={best} label="Longest current streak" tone="text-signal" />
        <Figure value={items.length} label="Plants" />
      </div>

      <form onSubmit={add} className={clsx('flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-ink-1 p-3', !planting && 'max-md:hidden')}>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Icon">
          {HABIT_ICONS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={icon === id} aria-label={`Icon: ${ICON_LABEL[id]}`} title={ICON_LABEL[id]} onClick={() => setIcon(id)} className={clsx('grid size-9 place-items-center rounded-full transition-all', icon === id ? 'bg-signal text-ink-0' : 'text-bone-dim hover:bg-white/10 hover:text-bone')}>
              <HabitIcon id={id} size={16} />
            </button>
          ))}
        </div>
        <Input aria-label="New habit" placeholder="Plant a habit, e.g. Read 20 minutes" value={name} onChange={(e) => setName(e.target.value)} className="min-w-48 flex-1" />
        <Button type="submit" disabled={!name.trim()}>
          <Plus size={15} aria-hidden="true" /> Plant it
        </Button>
      </form>

      {loaded && items.length === 0 ? (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-line-strong p-6">
          <div className="min-w-[min(100%,15rem)] flex-1">
            <h2 className="font-display text-lead text-bone">The garden is empty</h2>
            <p className="text-fine text-bone-dim">Plant your first habit above, or look at a garden that has been growing for a while.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => habits.putMany(sampleHabits())}>
            <Sparkles size={14} aria-hidden="true" /> Try with a sample garden
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {items.map((h) => (
            <HabitCard key={h.id} habit={h} mood={mood} />
          ))}
        </div>
      )}
      <Tile className="text-fine text-bone-dim">
        Plants grow at 1, 3, 7, 14 and 30 days in a row. Mood comes from your journal in Second Brain: once a habit has a few days with and without it, you will see what it does for you.
      </Tile>
    </div>
  );
}
