import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellOff, BookOpenCheck, CalendarClock, CheckCircle2, Layers, Pause, Play, Plus, RotateCcw, Sparkles, Timer, Trash2 } from 'lucide-react';
import { Badge, Button, DatePicker, Input, Select, Textarea } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { generateCards } from '../api/owner';
import { MODES, dismiss, focus, pause, reset, setMode, start } from '../focus/store';
import FocusStats from '../components/FocusStats';
import { Figure, PageHead, Segmented, Tile } from '../components/Page';
import { loadNotes } from '../notes/library';
import { useReadableNotes } from '../diary/useLock';
import { titleOf } from '../notes/notes';
import { GRADES, clock, countdown, dueCards, newFlashcard, nextLabels, review, upcoming } from '../study/model';
import { courses, flashcards, sampleStudy } from '../study/store';
import { useStore } from '../store';

const TABS = [
  { id: 'overview', label: 'Overview', icon: CalendarClock },
  { id: 'cards', label: 'Flashcards', icon: Layers },
  { id: 'focus', label: 'Focus', icon: Timer },
];

const TONE = { past: 'danger', soon: 'warn', later: 'default' };
const fromInput = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 9).getTime();
};

function Overview({ list, cardList }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const soon = useMemo(() => upcoming(list), [list]);
  const now = Date.now();

  const addCourse = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await courses.create({ name: name.trim().slice(0, 60), code: code.trim().slice(0, 12).toUpperCase(), hue: (list.length * 67 + 20) % 360, exams: [], deadlines: [] });
    setName('');
    setCode('');
  };
  const addDate = async (course, kind, title, value) => {
    if (!title.trim() || !value) return;
    const item = { id: crypto.randomUUID(), title: title.trim().slice(0, 80), at: fromInput(value), ...(kind === 'deadlines' ? { done: false } : {}) };
    await courses.update(course.id, { [kind]: [...(course[kind] ?? []), item].sort((a, b) => a.at - b.at) });
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <form onSubmit={addCourse} className="flex flex-wrap items-center gap-2 rounded-[1.75rem] border border-line bg-ink-1 p-2.5">
          <Input aria-label="Course name" placeholder="Add a course, e.g. Database Systems" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 basis-full border-transparent bg-transparent sm:basis-0" />
          <Input aria-label="Course code" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="min-w-0 flex-1 border-transparent bg-transparent sm:w-24 sm:flex-none" />
          <Button type="submit" size="sm" disabled={!name.trim()} className="h-10">
            <Plus size={15} aria-hidden="true" /> Add course
          </Button>
        </form>
        {list.map((course) => {
          const due = dueCards(cardList, now, course.id).length;
          return (
            <CourseCard key={course.id} course={course} due={due} onAdd={addDate} />
          );
        })}
      </div>
      <Tile title="Coming up" className="h-fit">
        {soon.length ? (
          <ul className="flex flex-col gap-1.5" data-upcoming>
            {soon.slice(0, 10).map((u) => {
              const c = countdown(u.at, now);
              return (
                <li key={`${u.kind}-${u.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: `hsl(${u.course.hue} 80% 65%)` }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block truncate text-fine font-medium text-bone">{u.title}</b>
                    <small className="font-mono text-[0.68rem] text-bone-faint">
                      {u.kind === 'exam' ? 'Exam' : 'Deadline'} · {u.course.name}
                    </small>
                  </span>
                  <Badge tone={TONE[c.tone]}>{c.label}</Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="font-mono text-fine text-bone-faint">No exams or deadlines coming up. Add them to a course.</p>
        )}
      </Tile>
    </div>
  );
}

function CourseCard({ course, due, onAdd }) {
  const [kind, setKind] = useState('deadlines');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const now = Date.now();
  const next = upcoming([course], now)[0];
  return (
    <section className="rounded-3xl border border-line bg-ink-1 p-5" data-course={course.name}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl font-mono text-[0.72rem] font-semibold" style={{ background: `hsl(${course.hue} 60% 50% / 0.2)`, color: `hsl(${course.hue} 85% 78%)` }}>
          {(course.code || course.name).slice(0, 3).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h3 className="truncate font-display text-lead text-bone">{course.name}</h3>
          <p className="mt-0.5 font-mono text-[0.72rem] text-bone-faint">
            {next ? `${next.title} ${countdown(next.at, now).label}` : 'Nothing scheduled'}
            {due > 0 ? ` · ${due} card${due > 1 ? 's' : ''} due` : ''}
          </p>
        </div>
        <button type="button" aria-label={`Delete ${course.name}`} onClick={() => courses.remove(course.id)} className="text-bone-faint hover:text-danger">
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
      {[...(course.exams ?? []).map((e) => ({ ...e, kind: 'exams' })), ...(course.deadlines ?? []).map((d) => ({ ...d, kind: 'deadlines' }))]
        .sort((a, b) => a.at - b.at)
        .map((item) => (
          <div key={item.id} className="mt-2 flex items-center gap-2.5 text-fine">
            {item.kind === 'deadlines' ? (
              <button type="button" role="checkbox" aria-checked={Boolean(item.done)} aria-label={`Mark ${item.title} done`} onClick={() => courses.update(course.id, { deadlines: course.deadlines.map((d) => (d.id === item.id ? { ...d, done: !d.done } : d)) })} className={clsx('grid size-5 shrink-0 place-items-center rounded-md border', item.done ? 'border-signal bg-signal text-ink-0' : 'border-line-strong')}>
                {item.done && <CheckCircle2 size={12} aria-hidden="true" />}
              </button>
            ) : (
              <BookOpenCheck size={16} className="shrink-0 text-warn" aria-hidden="true" />
            )}
            <span className={clsx('flex-1', item.done ? 'text-bone-faint line-through' : 'text-bone-dim')}>{item.title}</span>
            <small className="font-mono text-[0.68rem] text-bone-faint">{countdown(item.at, now).label}</small>
            <button type="button" aria-label={`Remove ${item.title}`} onClick={() => courses.update(course.id, { [item.kind]: course[item.kind].filter((x) => x.id !== item.id) })} className="text-bone-faint hover:text-danger">
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onAdd(course, kind, title, date);
          setTitle('');
        }}
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"
      >
        <div className="basis-full">
          <div className="w-fit">
            <Segmented
              label="Type"
              value={kind}
              onChange={setKind}
              options={[
                { id: 'deadlines', label: 'Deadline', icon: CalendarClock },
                { id: 'exams', label: 'Exam', icon: BookOpenCheck },
              ]}
            />
          </div>
        </div>
        <Input aria-label="What" placeholder="What is it?" value={title} onChange={(e) => setTitle(e.target.value)} compact className="min-w-40 flex-1" />
        <DatePicker aria-label="Date" value={date} onChange={setDate} compact clearable={false} className="w-44" />
        <Button type="submit" size="sm" disabled={!title.trim() || !date} className="h-10">
          <Plus size={14} aria-hidden="true" /> Add
        </Button>
      </form>
    </section>
  );
}

function Cards({ list, cardList }) {
  const notes = useReadableNotes();
  const [deck, setDeck] = useState('all');
  const [shown, setShown] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [source, setSource] = useState('');
  const [made, setMade] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const decks = [{ id: 'all', name: 'All decks' }, { id: '', name: 'General' }, ...list.map((c) => ({ id: c.id, name: c.name }))];
  const inDeck = deck === 'all' ? cardList : cardList.filter((c) => c.deck === deck);
  const now = Date.now();
  const due = dueCards(inDeck, now);
  const card = due[0];
  const mastered = inDeck.filter((c) => c.interval >= 21).length;

  useEffect(() => {
    void loadNotes();
  }, []);

  const answer = useCallback(
    async (grade) => {
      if (!card) return;
      setShown(false);
      await flashcards.put(review(card, grade));
    },
    [card]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') || !card) return;
      if (e.key === ' ') {
        e.preventDefault();
        setShown(true);
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) void answer(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, shown, answer]);

  const add = async (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    await flashcards.create(newFlashcard(front, back, deck === 'all' ? '' : deck));
    setFront('');
    setBack('');
  };

  const fromText = async (text) => {
    setBusy(true);
    setProblem('');
    try {
      const { cards } = await generateCards({ text });
      setMade(cards.map((c) => ({ ...c, keep: true })));
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  const keepMade = async () => {
    for (const c of made.filter((x) => x.keep)) await flashcards.create(newFlashcard(c.front, c.back, deck === 'all' ? '' : deck));
    setMade(null);
    setSource('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <Figure value={due.length} label="Due now" tone={due.length ? 'text-signal' : 'text-bone'} />
        <Figure value={inDeck.length} label="Cards" />
        <Figure value={mastered} label="Well known" tone="text-ok" />
      </div>
      <div className="flex items-center gap-2">
        <Select aria-label="Deck" value={deck} onChange={(e) => { setDeck(e.target.value); setShown(false); }} compact wrapperClassName="w-56">
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      <section className="grid min-h-[300px] place-items-center rounded-3xl border border-line bg-[radial-gradient(70%_100%_at_50%_0%,rgb(138_59_255/0.14),transparent_60%),var(--color-ink-1)] p-6" aria-label="Review">
        {card ? (
          <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center" data-review>
            <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{due.length} left in this session</span>
            <h2 className="font-display text-h3 leading-snug text-bone" data-front>
              {card.front}
            </h2>
            {shown ? (
              <>
                <p className="rounded-2xl border border-line bg-black/25 px-5 py-4 text-body leading-relaxed text-bone" data-back>
                  {card.back}
                </p>
                <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADES.map((g, i) => (
                    <button key={g.id} type="button" onClick={() => answer(g.id)} title={g.hint} className={clsx('flex flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 transition-all hover:-translate-y-0.5', g.id === 0 ? 'border-danger/40 hover:bg-danger/10' : g.id === 3 ? 'border-ok/40 hover:bg-ok/10' : 'border-line hover:bg-white/6')}>
                      <b className="text-fine font-medium text-bone">{g.label}</b>
                      <small className="font-mono text-[0.64rem] text-bone-faint">
                        {nextLabels(card, now)[i]} · {i + 1}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <Button onClick={() => setShown(true)}>
                Show the answer <small className="font-mono opacity-60">space</small>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <CheckCircle2 size={34} className="text-ok" aria-hidden="true" />
            <h2 className="font-display text-h3 text-bone">{inDeck.length ? 'All caught up' : 'No cards yet'}</h2>
            <p className="text-fine text-bone-dim">{inDeck.length ? 'Nothing is due in this deck. Come back later, or add more cards below.' : 'Add a card below, or make some from your notes.'}</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Tile title="Add a card">
          <form onSubmit={add} className="flex flex-col gap-2">
            <Input aria-label="Front" placeholder="Question or term" value={front} onChange={(e) => setFront(e.target.value)} />
            <Textarea aria-label="Back" rows={2} placeholder="Answer" value={back} onChange={(e) => setBack(e.target.value)} />
            <Button type="submit" size="sm" disabled={!front.trim() || !back.trim()} className="self-start">
              Add card
            </Button>
          </form>
        </Tile>
        <Tile title="Make cards from your text" aside={<Badge tone="signal">AI</Badge>}>
          <div className="flex flex-col gap-2">
            <Select aria-label="Use a note" value="" onChange={(e) => { const n = notes.find((x) => x.id === e.target.value); if (n) setSource(n.text); }} compact>
              <option value="">Use a note…</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {titleOf(n.text)}
                </option>
              ))}
            </Select>
            <Textarea aria-label="Text to learn from" rows={3} placeholder="…or paste what you are studying" value={source} onChange={(e) => setSource(e.target.value)} />
            <Button size="sm" loading={busy} disabled={source.trim().length < 40} onClick={() => fromText(source)} className="self-start">
              <Sparkles size={14} aria-hidden="true" /> Make cards
            </Button>
            {problem && <p className="font-mono text-fine text-danger">{problem}</p>}
          </div>
        </Tile>
      </div>

      {made && (
        <Tile title={`${made.length} cards to look over`} aside={<Button size="sm" onClick={keepMade} disabled={!made.some((c) => c.keep)}>Add the ticked ones</Button>}>
          <ul className="flex flex-col gap-2" data-made>
            {made.map((c, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-ink-2 p-3">
                <input type="checkbox" aria-label={`Keep: ${c.front}`} checked={c.keep} onChange={() => setMade(made.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))} className="mt-1 accent-[var(--color-signal)]" />
                <span className="leading-snug">
                  <b className="block text-fine font-medium text-bone">{c.front}</b>
                  <small className="text-fine text-bone-dim">{c.back}</small>
                </span>
              </li>
            ))}
          </ul>
        </Tile>
      )}
    </div>
  );
}

function Focus({ onFocusMusic }) {
  const { mode, status, total, left, sessions } = useStore(focus);
  const running = status === 'running';
  const ringing = status === 'done';
  const r = 96;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-[radial-gradient(70%_100%_at_50%_0%,rgb(255_91_46/0.14),transparent_60%),var(--color-ink-1)] p-8">
        <Segmented value={mode} onChange={setMode} options={MODES.map((m) => ({ id: m.id, label: m.label }))} label="Timer mode" />
        <div className="relative size-60" role="timer" aria-live="off" aria-label={`${clock(left)} left`}>
          <svg viewBox="0 0 220 220" className="-rotate-90">
            <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
            <circle cx="110" cy="110" r={r} fill="none" stroke="url(#pomo)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} className="transition-[stroke-dashoffset] duration-300" />
            <defs>
              <linearGradient id="pomo" x1="0" x2="1">
                <stop offset="0" stopColor="#ff5b2e" />
                <stop offset="1" stopColor="#8a3bff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <b className={clsx('font-display text-display leading-none text-bone tabular-nums [font-size:clamp(3rem,7vw,4.4rem)]', ringing && 'animate-pulse text-signal')} data-clock>
              {clock(left)}
            </b>
          </span>
        </div>
        {ringing ? (
          <Button onClick={dismiss}>
            <BellOff size={16} aria-hidden="true" /> Stop the alarm
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Reset the timer" onClick={reset}>
              <RotateCcw size={15} aria-hidden="true" />
            </Button>
            <button type="button" onClick={running ? pause : start} aria-label={running ? 'Pause the timer' : 'Start the timer'} className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-signal to-[#ff8a5c] text-ink-0 shadow-[0_10px_30px_-8px_rgb(255_91_46/0.8)] transition-transform hover:scale-105 active:scale-95">
              {running ? <Pause size={24} fill="currentColor" aria-hidden="true" /> : <Play size={24} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
            </button>
            <Button variant="ghost" size="sm" onClick={onFocusMusic}>
              <Sparkles size={14} aria-hidden="true" /> Focus music
            </Button>
          </div>
        )}
      </section>
      <div className="flex flex-col gap-3">
        <Figure value={sessions} label="Focus sessions today" tone="text-signal" />
        <FocusStats />
        <Tile title="How it works">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-fine text-bone-dim">
            <li>Focus for 25 minutes on one thing.</li>
            <li>Take a 5 minute break. After four sessions, a longer one.</li>
            <li>The timer floats above every screen while it runs, shows on your lock screen, and rings when the time is up.</li>
          </ol>
        </Tile>
      </div>
    </div>
  );
}

export default function StudyView({ onFocusMusic }) {
  const { items: courseList } = useStore(courses.store);
  const { items: cardList } = useStore(flashcards.store);
  const [tab, setTab] = useState(() => (focus.get().status === 'idle' ? 'overview' : 'focus'));

  useEffect(() => {
    void courses.load();
    void flashcards.load();
  }, []);

  const empty = courseList.length === 0 && cardList.length === 0;
  const hasSample = courseList.some((c) => c.sample);

  return (
    <div className="flex flex-col gap-6">
      <PageHead keepOnPhone eyebrow="Learn" title="Study" accent="Hub." description="Courses and deadlines, flashcards that come back just before you forget, and a focus timer.">
        {hasSample && (
          <Button variant="ghost" size="sm" className="max-md:hidden" onClick={async () => { await Promise.all(courseList.filter((c) => c.sample).map((c) => courses.remove(c.id))); await Promise.all(cardList.filter((c) => c.sample).map((c) => flashcards.remove(c.id))); }}>
            Remove samples
          </Button>
        )}
        <Segmented value={tab} onChange={setTab} options={TABS} label="Study" />
      </PageHead>

      {empty && tab !== 'focus' && (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-line-strong p-6">
          <div className="min-w-[min(100%,15rem)] flex-1">
            <h2 className="font-display text-lead text-bone">Nothing here yet</h2>
            <p className="text-fine text-bone-dim">Add a course below, or start with an example course, exam and a few cards.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { const s = sampleStudy(); await courses.put(s.course); await flashcards.putMany(s.cards); }}>
            <Sparkles size={14} aria-hidden="true" /> Try with a sample course
          </Button>
        </div>
      )}

      {tab === 'overview' && <Overview list={courseList} cardList={cardList} />}
      {tab === 'cards' && <Cards list={courseList} cardList={cardList} />}
      {tab === 'focus' && <Focus onFocusMusic={onFocusMusic} />}
    </div>
  );
}
