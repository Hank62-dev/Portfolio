import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Download, Flame, LayoutGrid, List as ListIcon, Pin, Plus, Search, Sparkles, Upload } from 'lucide-react';
import { Badge, Button, Loading, Menu, Skeleton, SkeletonLines } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { askNotes } from '../api/owner';
import { MOODS, excerpt, hueOf, journalStreak, moodSeries, searchNotes, tagsOf, textToHtml, titleOf } from '../notes/notes';
import { createNote, deleteNote, exportNotes, importNotes, intents, loadNotes, notesStore, openJournal } from '../notes/library';
import { ensureUnlocked, readable } from '../diary/lock';
import { useReadableNotes } from '../diary/useLock';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { PageHead } from '../components/Page';
import { useFab } from '../fab';
import { useStore } from '../store';

const Markdown = lazy(() => import('../components/Markdown'));
const NoteEditor = lazy(() => import('../notes/NoteEditor'));

const SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'journal', label: 'Journal' },
];

const download = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const ago = (time) => {
  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return new Date(time).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const words = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-1 p-4">
      <b className="block font-display text-h3 leading-none text-bone tabular-nums">{value}</b>
      <small className="mt-1.5 block font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{label}</small>
    </div>
  );
}

/** The last 30 days of journal moods as slim bars: taller is a better day, a low dot is a day not written. */
function MoodChart({ notes }) {
  const series = useMemo(() => moodSeries(notes, 30), [notes]);
  return (
    <div className="flex h-14 items-end gap-[3px]" role="img" aria-label="Mood over the last 30 days">
      {series.map(({ day, mood }) => (
        <i
          key={day}
          title={mood ? `${day}: ${MOODS[mood - 1].label}` : `${day}: not written`}
          className={clsx('block flex-1 rounded-full', mood ? 'bg-gradient-to-t from-signal to-[#ffb38a]' : 'bg-line')}
          style={{ height: mood ? `${14 + mood * 17}%` : '7%', opacity: mood ? 0.45 + mood * 0.11 : 1 }}
        />
      ))}
    </div>
  );
}

function NoteCard({ note, query, onOpen, grid }) {
  const tags = tagsOf(note.text);
  const hue = hueOf(tags[0] ?? (note.day ? 'journal' : titleOf(note.text)[0]));
  const mood = note.mood ? MOODS[note.mood - 1].label : '';
  return (
    <li className={clsx(grid && 'mb-3 break-inside-avoid max-md:mb-2.5')} data-note-row>
      <button
        type="button"
        onClick={() => onOpen(note.id)}
        className="group relative flex w-full flex-col gap-2 overflow-hidden rounded-2xl border border-line bg-ink-1 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_18px_40px_-20px_rgb(0_0_0/0.9)] max-md:gap-1.5 max-md:rounded-xl max-md:p-3 max-md:active:scale-[0.98]"
        style={{ backgroundImage: `linear-gradient(160deg, hsl(${hue} 55% 50% / 0.13), transparent 70%)` }}
      >
        <i className="absolute inset-x-0 top-0 h-0.5 opacity-80" style={{ background: `linear-gradient(90deg, hsl(${hue} 80% 60%), transparent)` }} aria-hidden="true" />
        <span className="flex items-start gap-2">
          <b className="min-w-0 flex-1 font-display text-lead leading-snug text-bone max-md:line-clamp-2 max-md:text-[1.02rem]">{titleOf(note.text)}</b>
          {note.pinned && <Pin size={13} className="mt-1.5 shrink-0 text-signal" aria-label="Pinned" />}
        </span>
        <span className={clsx('text-fine leading-relaxed text-bone-dim max-md:text-[0.8rem] max-md:leading-snug', grid ? 'line-clamp-6 max-md:line-clamp-5' : 'line-clamp-2')}>{excerpt((note.text.replace(/^.*\n/, '') || note.text).replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '$1').trim(), query, 220)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 max-md:mt-0.5 max-md:gap-1">
          {note.day && <Badge tone="signal">JOURNAL</Badge>}
          {mood && <Badge className="max-md:hidden">{mood}</Badge>}
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full px-2 py-0.5 font-mono text-[0.68rem]" style={{ background: `hsl(${hueOf(t)} 60% 50% / 0.16)`, color: `hsl(${hueOf(t)} 80% 78%)` }}>
              #{t}
            </span>
          ))}
          <span className="ml-auto font-mono text-[0.68rem] text-bone-faint max-md:hidden">
            {ago(note.updatedAt)} · {words(note.text)} w
          </span>
        </span>
      </button>
    </li>
  );
}

export default function NotesView() {
  const { loaded, error } = useStore(notesStore);
  const notes = useReadableNotes();
  const intent = useStore(intents, (s) => s.notes);
  const [selected, setSelected] = useState(null);
  const [scope, setScope] = useState('all');
  const [layout, setLayout] = useState('grid');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [problem, setProblem] = useState('');
  const importer = useRef(null);

  useEffect(() => {
    void loadNotes();
  }, []);

  const ask = useCallback(
    async (text) => {
      const q = text.trim();
      if (!q || asking) return;
      setAsking(true);
      setProblem('');
      setAnswer(null);
      try {
        const found = searchNotes(readable(notesStore.get().notes), q, 6);
        if (!found.length) {
          setAnswer({ question: q, text: 'None of your notes mention that, so there is nothing to answer from.', sources: [] });
          return;
        }
        const result = await askNotes({ question: q, notes: found.map(({ note }) => ({ title: titleOf(note.text), text: note.text })) });
        setAnswer({ question: q, text: result.answer, sources: found.map(({ note }) => note), cited: result.cited });
      } catch (e) {
        setProblem(e.message);
      } finally {
        setAsking(false);
      }
    },
    [asking]
  );

  // requests from the command palette
  const handled = useRef(null);
  useEffect(() => {
    if (!loaded || !intent || handled.current === intent.nonce) return;
    handled.current = intent.nonce;
    setSelected(null);
    if (intent.search) setQuery(intent.search);
    if (intent.question) {
      setQuestion(intent.question);
      void ask(intent.question);
    }
    if (intent.open) setSelected(intent.open);
    if (intent.text) createNote(intent.text, { html: textToHtml(intent.text) }).then((note) => setSelected(note.id));
    intents.set({ notes: null });
  }, [intent, loaded, ask]);

  const tags = useMemo(() => [...new Set(notes.flatMap((n) => tagsOf(n.text)))].sort(), [notes]);
  const visible = useMemo(() => {
    let base = notes;
    if (scope === 'pinned') base = base.filter((n) => n.pinned);
    if (scope === 'journal') base = base.filter((n) => n.day);
    if (tag) base = base.filter((n) => tagsOf(n.text).includes(tag));
    return query.trim() ? searchNotes(base, query, 60).map((r) => r.note) : base;
  }, [notes, query, tag, scope]);
  const current = notes.find((n) => n.id === selected);
  const streak = useMemo(() => journalStreak(notes), [notes]);
  const totalWords = useMemo(() => notes.reduce((n, note) => n + words(note.text), 0), [notes]);
  const suggestions = useMemo(
    () => [...notes.slice(0, 3).map((n) => `What did I write about ${titleOf(n.text)}?`), ...tags.slice(0, 1).map((t) => `Summarise my notes tagged #${t}`)].slice(0, 3),
    [notes, tags]
  );
  const related = useMemo(() => {
    if (!current) return [];
    return searchNotes(
      notes.filter((n) => n.id !== current.id),
      titleOf(current.text),
      3
    ).map((r) => r.note);
  }, [current, notes]);

  const newNote = async () => setSelected((await createNote('')).id);
  const today = async () => {
    if (await ensureUnlocked()) setSelected((await openJournal()).id);
  };
  const [askOpen, setAskOpen] = useState(false); // phones: the Ask card opens from a button
  const [tagsOpen, setTagsOpen] = useState(false);
  const phone = !useMediaQuery('(min-width: 768px)');
  const gridView = layout === 'grid' || phone;
  const pinnedNotes = visible.filter((n) => n.pinned);
  const groups = scope === 'all' && !query.trim() && pinnedNotes.length > 0 && pinnedNotes.length < visible.length;
  const list = (items) => (
    <ul className={clsx(gridView ? 'columns-2 gap-2.5 xl:columns-3 xl:gap-3' : 'flex flex-col gap-2')} aria-label="Notes">
      {items.map((note) => (
        <NoteCard key={note.id} note={note} query={query} onOpen={setSelected} grid={gridView} />
      ))}
    </ul>
  );
  useFab(selected ? null : { label: 'New note', icon: Plus, onPress: newNote });
  const remove = async () => {
    await deleteNote(current.id);
    setSelected(null);
  };
  const restore = async (file) => {
    try {
      const added = await importNotes(await file.text());
      setProblem(added ? '' : 'Nothing new in that file.');
    } catch (e) {
      setProblem(e.message);
    }
  };

  if (current) {
    return (
      <Suspense
        fallback={
          <Loading label="Opening the note" className="flex min-h-[50vh] flex-col gap-4 py-6">
            <Skeleton className="h-9 w-2/3" />
            <SkeletonLines lines={6} />
          </Loading>
        }
      >
        <NoteEditor key={current.id} note={current} related={related} onOpen={setSelected} onBack={() => setSelected(null)} onDelete={remove} />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead keepOnPhone eyebrow="Private notes" title="Second" accent="Brain." description="Notes and a daily journal, kept on this device. Ask them a question and Hank answers from what you wrote.">
        <Button variant="ghost" size="sm" onClick={today}>
          <BookOpen size={15} aria-hidden="true" /> Today's journal
        </Button>
        <Button variant="ghost" size="sm" aria-expanded={askOpen} onClick={() => setAskOpen((open) => !open)} className="md:hidden">
          <Sparkles size={15} aria-hidden="true" /> Ask your notes
        </Button>
        <Button size="sm" onClick={newNote} className="max-md:hidden">
          <Plus size={15} aria-hidden="true" /> New note
        </Button>
      </PageHead>

      {/* ask + journal, as a bento */}
      <div className={clsx('grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]', !askOpen && 'max-md:hidden')}>
        <section className="relative overflow-hidden rounded-3xl border border-signal/25 bg-[radial-gradient(90%_120%_at_0%_0%,rgb(255_91_46/0.16),transparent_60%),radial-gradient(70%_100%_at_100%_100%,rgb(91_43_255/0.16),transparent_60%),var(--color-ink-1)] p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-signal text-ink-0">
              <Sparkles size={15} aria-hidden="true" />
            </span>
            <h2 className="font-display text-lead text-bone">Ask your notes</h2>
          </div>
          <form
            className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5 pl-4 backdrop-blur focus-within:border-signal/60"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <input
              aria-label="Ask your notes"
              placeholder={notes.length ? 'When is my flight? What did I decide about the logo?' : 'Write a few notes first, then ask them anything'}
              className="h-10 min-w-0 flex-1 bg-transparent text-body text-bone placeholder:text-bone-faint focus-visible:outline-none disabled:opacity-60"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!notes.length}
            />
            <Button type="submit" size="sm" loading={asking} disabled={!question.trim() || !notes.length}>
              Ask
            </Button>
          </form>
          {suggestions.length > 0 && !answer && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setQuestion(s)} className="max-w-full truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.72rem] text-bone-dim transition-colors hover:border-signal/50 hover:text-bone">
                  {s}
                </button>
              ))}
            </div>
          )}
          {problem && (
            <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
              {problem}
            </p>
          )}
          {answer && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur" data-answer>
              <Suspense
                fallback={
                  <Loading label="Loading the answer">
                    <SkeletonLines lines={3} />
                  </Loading>
                }
              >
                <Markdown>{answer.text}</Markdown>
              </Suspense>
              {answer.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
                  <span className="font-mono text-[0.72rem] text-bone-faint">From</span>
                  {answer.sources.map((note, i) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setSelected(note.id)}
                      className={clsx('rounded-full border px-2.5 py-1 font-mono text-[0.72rem] transition-colors hover:border-signal', answer.cited?.includes(i + 1) ? 'border-signal/60 text-bone' : 'border-line text-bone-faint')}
                    >
                      [{i + 1}] {titleOf(note.text)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-ink-1 p-5 max-md:hidden sm:p-6" aria-label="Journal">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Journal</span>
              <h2 className="font-display text-lead text-bone">Last 30 days</h2>
            </div>
            {streak > 0 && (
              <Badge tone="signal">
                <Flame size={11} aria-hidden="true" /> {streak} day{streak > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <MoodChart notes={notes} />
          <Button variant="ghost" size="sm" onClick={today}>
            <BookOpen size={14} aria-hidden="true" /> Write today
          </Button>
        </section>
      </div>

      <div className="grid grid-cols-3 gap-3 max-md:hidden">
        <Stat value={notes.length} label="Notes" />
        <Stat value={totalWords.toLocaleString()} label="Words" />
        <Stat value={tags.length} label="Tags" />
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-line bg-ink-1 p-1" role="tablist" aria-label="Show">
          {SCOPES.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={scope === id} onClick={() => setScope(id)} className={clsx('rounded-full px-3.5 py-1 font-mono text-[0.78rem] transition-colors', scope === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-44 flex-1 max-md:order-first max-md:basis-full sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bone-faint" aria-hidden="true" />
          <input
            aria-label="Search notes"
            placeholder="Search notes…"
            className="h-10 w-full rounded-full border border-line bg-ink-1 pr-4 pl-10 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none max-md:h-11 max-md:bg-ink-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-1.5 max-md:hidden">
          <div className="flex rounded-full border border-line bg-ink-1 p-1">
            {[
              ['grid', LayoutGrid, 'Grid view'],
              ['list', ListIcon, 'List view'],
            ].map(([id, Icon, label]) => (
              <button key={id} type="button" aria-label={label} aria-pressed={layout === id} onClick={() => setLayout(id)} className={clsx('grid size-8 place-items-center rounded-full transition-colors', layout === id ? 'bg-white/12 text-bone' : 'text-bone-faint hover:text-bone')}>
                <Icon size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
          <Menu
            align="end"
            trigger={
              <Button variant="ghost" size="sm" aria-label="Backup">
                Backup
              </Button>
            }
            items={[
              { id: 'export', label: 'Export notes (.json)', icon: Download, onSelect: () => notes.length && download('hank62-notes.json', exportNotes()) },
              { id: 'import', label: 'Import notes', icon: Upload, onSelect: () => importer.current?.click() },
            ]}
          />
          <input
            ref={importer}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void restore(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="-mt-3 flex flex-wrap gap-1.5 max-md:mt-0" aria-label="Tags">
          {(phone && !tagsOpen ? tags.slice(0, 4) : tags).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(tag === t ? '' : t)}
              className={clsx('rounded-full border px-3 py-1 font-mono text-[0.72rem] transition-colors', tag === t ? 'border-transparent text-ink-0' : 'border-line text-bone-dim hover:border-line-strong')}
              style={tag === t ? { background: `hsl(${hueOf(t)} 80% 70%)` } : undefined}
            >
              #{t}
            </button>
          ))}
          {phone && tags.length > 4 && (
            <button type="button" onClick={() => setTagsOpen((open) => !open)} className="rounded-full border border-dashed border-line px-3 py-1 font-mono text-[0.72rem] text-bone-faint">
              {tagsOpen ? 'Less' : `+${tags.length - 4}`}
            </button>
          )}
        </div>
      )}

      {/* notes */}
      {!loaded ? (
        <p className="font-mono text-fine text-bone-faint">Opening your notes…</p>
      ) : error ? (
        <p className="font-mono text-fine text-danger">{error}</p>
      ) : visible.length ? (
        <div className="flex flex-col gap-5">
          {groups ? (
            <>
              <section aria-label="Pinned notes">
                <h2 className="mb-2 font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">Pinned</h2>
                {list(pinnedNotes)}
              </section>
              <section aria-label="Other notes">
                <h2 className="mb-2 font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">Others</h2>
                {list(visible.filter((n) => !n.pinned))}
              </section>
            </>
          ) : (
            list(visible)
          )}
        </div>
      ) : (
        <div className="grid min-h-[260px] place-items-center rounded-3xl border border-dashed border-line text-center">
          <div className="flex max-w-sm flex-col items-center gap-3 p-6">
            <span className="grid size-14 place-items-center rounded-full bg-signal-soft text-signal">
              <BookOpen size={24} aria-hidden="true" />
            </span>
            <h2 className="font-display text-h3 leading-tight text-bone">{notes.length ? 'No note matches' : 'Start your second brain'}</h2>
            <p className="text-fine text-bone-dim">{notes.length ? 'Try other words, or clear the filters.' : 'Write down what you would otherwise forget. It stays on this device, and you can ask it questions later.'}</p>
            {!notes.length && (
              <div className="flex gap-2">
                <Button size="sm" onClick={newNote}>
                  New note
                </Button>
                <Button variant="ghost" size="sm" onClick={today}>
                  Today's journal
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
