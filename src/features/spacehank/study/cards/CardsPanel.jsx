import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flame, Layers, Play, Plus, Search, Sparkles } from 'lucide-react';
import { Badge, Button, Input, pushToast } from '../../../../design-system';
import { clsx } from '../../../../lib/format';
import { useFab } from '../../fab';
import { loadNotes } from '../../notes/library';
import { useReadableNotes } from '../../diary/useLock';
import { useStore } from '../../store';
import { courses, flashcards, sampleStudy } from '../store';
import CardEditor from './CardEditor';
import { answeredOn, reviewLog, studyStreak } from './log';
import MakeCards from './MakeCards';
import Session from './Session';
import { cardState, clozeFront, deckStats, dueIn, forecast, searchCards, sessionCards } from './states';
import { isDemo } from '../../demo/mode';

const STATE_TONE = { new: 'signal', learning: 'warn', mature: 'ok' };
const STATE_NAME = { new: 'New', learning: 'Learning', mature: 'Mature' };
const PAGE = 20;
const SESSION_MAX = 50;
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The spread of a deck: how much is new, still being learnt, and well known, as one bar. */
function SpreadBar({ stats }) {
  if (!stats.total) return <div className="h-2 rounded-full bg-white/[0.06]" />;
  const part = (n) => `${(n / stats.total) * 100}%`;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${stats.mature} well known, ${stats.learning} learning, ${stats.new} new`}>
      <i className="block bg-ok transition-[width] duration-500" style={{ width: part(stats.mature) }} />
      <i className="block bg-warn transition-[width] duration-500" style={{ width: part(stats.learning) }} />
      <i className="block bg-signal/80 transition-[width] duration-500" style={{ width: part(stats.new) }} />
    </div>
  );
}

/** The next seven days: how many cards come back on each. */
function Forecast({ counts }) {
  const top = Math.max(1, ...counts);
  const today = new Date().getDay();
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Cards due over the next seven days" data-forecast>
      {counts.map((n, i) => (
        <li key={i} className="flex flex-col items-center gap-1.5" title={`${i === 0 ? 'Today' : `In ${i} day${i > 1 ? 's' : ''}`}: ${n}`}>
          <span className="font-mono text-[0.62rem] text-bone-faint tabular-nums">{n || ''}</span>
          <span className="flex h-12 w-full max-w-8 items-end overflow-hidden rounded-xl bg-white/[0.05]">
            <i className={clsx('block w-full rounded-xl transition-[height] duration-500', i === 0 ? 'bg-signal' : 'bg-bone/60')} style={{ height: n ? `${Math.max(10, (n / top) * 100)}%` : 0 }} />
          </span>
          <span className={clsx('font-mono text-[0.62rem]', i === 0 ? 'text-signal' : 'text-bone-faint')}>{DAY_LETTER[(today + i) % 7]}</span>
        </li>
      ))}
    </ol>
  );
}

function Empty({ onAdd, onMake, onSample }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong p-8 text-center" data-empty-cards>
      <span className="grid size-12 place-items-center rounded-2xl bg-signal/15 text-signal">
        <Layers size={22} aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-display text-lead text-bone">No cards yet</h2>
        <p className="mt-1 max-w-[34ch] text-fine text-bone-dim">Write a card, or let the AI draft some from a note. Cards come back just before you would forget them.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} aria-hidden="true" /> Add a card
        </Button>
        <Button variant="ghost" size="sm" onClick={onMake}>
          <Sparkles size={14} aria-hidden="true" /> From my notes
        </Button>
        {isDemo() && (
          <Button variant="ghost" size="sm" onClick={onSample}>
            Try a sample deck
          </Button>
        )}
      </div>
    </div>
  );
}

/** The Flashcards tab: today's study card, the decks, and every card to look through and change. */
export default function CardsPanel() {
  const { items: list } = useStore(courses.store);
  const { items: cardList } = useStore(flashcards.store);
  const { log } = useStore(reviewLog);
  const notes = useReadableNotes();
  const [deck, setDeck] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [session, setSession] = useState(null); // { key, cards }
  const [editor, setEditor] = useState(null); // null, {} (new) or a card
  const [making, setMaking] = useState(false);
  useFab({ label: 'Add a card', icon: Plus, onPress: () => setEditor({}) });

  useEffect(() => {
    void loadNotes();
  }, []);

  const decks = useMemo(() => [{ id: '', name: 'General', hue: null }, ...list.map((c) => ({ id: c.id, name: c.name, hue: c.hue }))], [list]);
  const inDeck = useMemo(() => (deck === 'all' ? cardList : cardList.filter((c) => c.deck === deck)), [cardList, deck]);
  const now = Date.now();
  const stats = useMemo(() => deckStats(inDeck, now), [inDeck, now]);
  const counts = useMemo(() => forecast(inDeck, 7), [inDeck]);
  const found = useMemo(() => searchCards(inDeck, query).sort((a, b) => a.due - b.due), [inDeck, query]);
  const nextDue = inDeck.filter((c) => c.due > now).sort((a, b) => a.due - b.due)[0];
  const today = answeredOn(log);
  const run = studyStreak(log);
  const deckName = deck === 'all' ? 'All decks' : decks.find((d) => d.id === deck)?.name ?? 'Deck';

  const study = (ahead = false) => {
    const cards = sessionCards(inDeck, { ahead, limit: ahead ? 10 : SESSION_MAX });
    if (cards.length) setSession({ key: Date.now(), cards });
  };
  const addSample = async () => {
    const s = sampleStudy();
    await courses.put(s.course);
    await flashcards.putMany(s.cards);
  };

  if (cardList.length === 0 && !editor && !making)
    return (
      <>
        <Empty onAdd={() => setEditor({})} onMake={() => setMaking(true)} onSample={addSample} />
      </>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* today */}
      <section className="rounded-[1.75rem] border border-line bg-[radial-gradient(80%_120%_at_100%_0%,rgb(138_59_255/0.16),transparent_60%),var(--color-ink-1)] p-5 max-md:p-4" aria-label="Study today" data-study-today>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{deckName}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <b className={clsx('font-display text-[3rem] leading-none tabular-nums', stats.due ? 'text-signal' : 'text-ok')} data-due>
                {stats.due}
              </b>
              <span className="text-fine text-bone-dim">{stats.due === 1 ? 'card due' : 'cards due'}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.78rem] text-bone-dim">
            <span>
              <b className="text-bone tabular-nums">{today}</b> answered today
            </span>
            {run > 0 && (
              <span className="inline-flex items-center gap-1">
                <Flame size={13} className="text-signal" aria-hidden="true" /> {run}-day streak
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <SpreadBar stats={stats} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.74rem] text-bone-faint">
            <span>
              <i className="mr-1.5 inline-block size-2 rounded-full bg-signal/80" />
              {stats.new} new
            </span>
            <span>
              <i className="mr-1.5 inline-block size-2 rounded-full bg-warn" />
              {stats.learning} learning
            </span>
            <span>
              <i className="mr-1.5 inline-block size-2 rounded-full bg-ok" />
              {stats.mature} well known
            </span>
          </p>
        </div>

        <div className="mt-5">
          {stats.due > 0 ? (
            <Button onClick={() => study(false)} className="w-full justify-center" data-start-session>
              <Play size={15} fill="currentColor" aria-hidden="true" /> Study {Math.min(stats.due, SESSION_MAX)} {Math.min(stats.due, SESSION_MAX) === 1 ? 'card' : 'cards'}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-fine text-bone-dim" data-caught-up>
                <CheckCircle2 size={17} className="text-ok" aria-hidden="true" />
                {stats.total ? `All caught up${nextDue ? `. Next card ${dueIn(nextDue.due, now)}.` : '.'}` : 'No cards in this deck yet.'}
              </p>
              {stats.total > 0 && (
                <Button variant="ghost" onClick={() => study(true)} className="w-full justify-center" data-practice>
                  Practice ahead ({Math.min(10, stats.total)})
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <Forecast counts={counts} />
        </div>
      </section>

      {/* decks */}
      <section aria-label="Decks">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Deck">
          {[{ id: 'all', name: 'All', hue: null }, ...decks].map((d) => {
            const mine = d.id === 'all' ? cardList : cardList.filter((c) => c.deck === d.id);
            if (d.id === '' && mine.length === 0 && deck !== '') return null;
            const due = mine.filter((c) => c.due <= now).length;
            return (
              <button
                key={d.id || 'general'}
                type="button"
                role="tab"
                aria-selected={deck === d.id}
                onClick={() => {
                  setDeck(d.id);
                  setShown(PAGE);
                }}
                className={clsx('inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.82rem] transition-colors active:scale-95', deck === d.id ? 'border-bone bg-bone text-ink-0' : 'border-line text-bone-dim hover:border-line-strong hover:text-bone')}
              >
                {d.hue !== null && <i className="size-2 rounded-full" style={{ background: `hsl(${d.hue} 80% 65%)` }} aria-hidden="true" />}
                {d.name}
                <span className={clsx('rounded-full px-1.5 font-mono text-[0.68rem] tabular-nums', deck === d.id ? 'bg-ink-0/15' : 'bg-white/[0.07]')}>{due ? `${due} due` : mine.length}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setEditor({})} className="max-md:hidden" data-add-card>
          <Plus size={14} aria-hidden="true" /> Add a card
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMaking(true)}>
          <Sparkles size={14} aria-hidden="true" /> Make cards from notes
        </Button>
      </div>

      {/* every card */}
      <section aria-label="All cards" className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bone-faint" aria-hidden="true" />
          <Input aria-label="Search cards" placeholder={`Search ${inDeck.length} ${inDeck.length === 1 ? 'card' : 'cards'}`} value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} className="pl-10" />
        </div>
        {found.length === 0 ? (
          <p className="px-1 text-fine text-bone-faint">{query ? 'No card matches that.' : 'No cards in this deck yet.'}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-card-list>
            {found.slice(0, shown).map((c) => {
              const state = cardState(c);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => setEditor(c)} className="flex w-full items-start gap-3 rounded-2xl border border-line bg-ink-1 p-3.5 text-left transition-colors hover:border-line-strong active:bg-ink-2" aria-label={`Edit card: ${c.front}`}>
                    <span className="min-w-0 flex-1 leading-snug">
                      <b className="line-clamp-2 block text-fine font-medium text-bone">{clozeFront(c.front)}</b>
                      {c.back && <small className="mt-0.5 line-clamp-1 block text-[0.8rem] text-bone-dim">{c.back}</small>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={STATE_TONE[state]}>{STATE_NAME[state]}</Badge>
                      <small className="font-mono text-[0.64rem] text-bone-faint">{c.due <= now ? 'due now' : dueIn(c.due, now)}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {found.length > shown && (
          <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + PAGE)} className="self-center">
            Show {Math.min(PAGE, found.length - shown)} more
          </Button>
        )}
      </section>

      {session && <Session key={session.key} cards={session.cards} onClose={() => setSession(null)} onMore={() => study(false)} />}
      {editor && <CardEditor key={editor.id ?? 'new'} card={editor.id ? editor : null} decks={[{ id: '', name: 'General' }, ...list.map((c) => ({ id: c.id, name: c.name }))]} deck={deck === 'all' ? '' : deck} onClose={() => setEditor(null)} />}
      {making && <MakeCards notes={notes} deck={deck === 'all' ? '' : deck} onClose={() => setMaking(false)} onAdded={(n) => pushToast(`${n} ${n === 1 ? 'card' : 'cards'} added`)} />}
    </div>
  );
}

