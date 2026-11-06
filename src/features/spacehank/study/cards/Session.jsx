import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, Undo2, X } from 'lucide-react';
import { Button } from '../../../../design-system';
import { clsx } from '../../../../lib/format';
import { useHistoryLayer } from '../../hooks/useHistoryLayer';
import { useStore } from '../../store';
import { GRADES, nextLabels, review } from '../model';
import { flashcards } from '../store';
import { recordReview, unrecordReview } from './log';
import { clozeFront, clozeParts, dueIn, duration, hasCloze, summarize } from './states';
import { tr } from '../../lang';

const SWIPE = 100; // px to drag a card before letting go answers it
const TONE = [
  { ring: 'border-danger/50 hover:bg-danger/10 active:bg-danger/15', bar: 'bg-danger' },
  { ring: 'border-warn/50 hover:bg-warn/10 active:bg-warn/15', bar: 'bg-warn' },
  { ring: 'border-ok/50 hover:bg-ok/10 active:bg-ok/15', bar: 'bg-ok' },
  { ring: 'border-signal/50 hover:bg-signal/10 active:bg-signal/15', bar: 'bg-signal' },
];

const sizeOf = (text) => (text.length > 160 ? 'text-[1.15rem]' : text.length > 70 ? 'text-[1.4rem]' : 'text-[1.75rem]');

/** What one side of a card shows. A card with blanks hides them on the front and marks them on the back. */
function Side({ card, back }) {
  const cloze = hasCloze(card.front);
  const text = !back ? (cloze ? clozeFront(card.front) : card.front) : null;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="font-mono text-[0.62rem] tracking-[0.16em] text-bone-faint uppercase">{back ? tr('Answer') : cloze ? tr('Fill the blank') : tr('Question')}</span>
      {back ? (
        <>
          {cloze && (
            <p className={clsx('font-display leading-snug text-bone', sizeOf(card.front))} data-back>
              {clozeParts(card.front).map((part, i) =>
                part.blank ? (
                  <mark key={i} className="rounded-md bg-signal/20 px-1.5 text-signal">
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
          )}
          {card.back && (
            <p className={clsx('leading-relaxed whitespace-pre-line', cloze ? 'text-fine text-bone-dim' : clsx('font-display text-bone', sizeOf(card.back)))} data-back={cloze ? undefined : ''}>
              {card.back}
            </p>
          )}
        </>
      ) : (
        <h2 className={clsx('font-display leading-snug whitespace-pre-line text-bone', sizeOf(text))} data-front>
          {text}
        </h2>
      )}
    </div>
  );
}

/** The card, which turns over when tapped. When its answer is showing it can be dragged right ("Good") or left ("Again"). */
function Flip({ card, flipped, canSwipe, onFlip, onSwipe }) {
  const [dx, setDx] = useState(0);
  const drag = useRef(null);

  const down = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX - d.x;
    if (Math.abs(x) > 8) d.moved = true;
    if (canSwipe && d.moved) setDx(x);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (canSwipe && Math.abs(dx) > SWIPE) {
      const way = dx > 0 ? 2 : 0;
      setDx(0);
      onSwipe(way);
      return;
    }
    setDx(0);
    if (!d.moved) onFlip();
  };

  const share = Math.min(1, Math.abs(dx) / SWIPE);
  return (
    <div
      className="relative touch-pan-y select-none"
      style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 24}deg)` : undefined, transition: drag.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        drag.current = null;
        setDx(0);
      }}
      data-card-surface
    >
      <div className="[perspective:1400px]">
        <div className="grid motion-reduce:!transition-none" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <div
            className="col-start-1 row-start-1 grid min-h-[17rem] place-items-center rounded-[2rem] border border-line bg-[radial-gradient(90%_70%_at_50%_0%,rgb(138_59_255/0.16),transparent_62%),var(--color-ink-1)] p-6 shadow-[0_30px_70px_-40px_rgb(var(--shadow-rgb)/0.95)]"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            aria-hidden={flipped}
          >
            <Side card={card} />
          </div>
          <div
            className="col-start-1 row-start-1 grid min-h-[17rem] place-items-center rounded-[2rem] border border-signal/30 bg-[radial-gradient(90%_70%_at_50%_0%,rgb(255_91_46/0.14),transparent_62%),var(--color-ink-1)] p-6 shadow-[0_30px_70px_-40px_rgb(var(--shadow-rgb)/0.95)]"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            aria-hidden={!flipped}
          >
            <Side card={card} back />
          </div>
        </div>
      </div>
      {dx !== 0 && (
        <span className={clsx('pointer-events-none absolute top-4 rounded-full border-2 px-3 py-1 font-mono text-[0.78rem] font-semibold tracking-wide uppercase', dx > 0 ? 'left-4 border-ok text-ok' : 'right-4 border-danger text-danger')} style={{ opacity: share }}>
          {dx > 0 ? tr('Good') : tr('Again')}
        </span>
      )}
    </div>
  );
}

function Summary({ grades, startedAt, pool, onClose, onMore }) {
  const result = summarize(grades);
  const { items } = useStore(flashcards.store);
  const now = Date.now();
  const mine = items.filter((c) => pool.has(c.id));
  const dueLeft = mine.filter((c) => c.due <= now).length;
  const next = mine.filter((c) => c.due > now).sort((a, b) => a.due - b.due)[0];
  const top = Math.max(1, ...result.counts);
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-5 py-8 text-center" data-summary>
      <span className="grid size-16 place-items-center rounded-full bg-ok/15 text-ok ring-1 ring-ok/40">
        <Check size={30} strokeWidth={2.6} aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-display text-h3 text-bone">{result.total ? tr('Session complete') : tr('Nothing answered')}</h2>
        {result.total > 0 && (
          <p className="mt-1 text-fine text-bone-dim">
            {result.total} {result.total === 1 ? tr('answer') : tr('answers')} {tr('in')} {duration(Date.now() - startedAt)}
          </p>
        )}
      </div>
      {result.total > 0 && (
        <>
          <div className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-3xl border border-line bg-ink-1 p-4">
              <b className="block font-display text-h3 leading-none text-ok">{result.accuracy}%</b>
              <small className="mt-2 block text-[0.74rem] text-bone-faint">{tr('Remembered')}</small>
            </div>
            <div className="rounded-3xl border border-line bg-ink-1 p-4">
              <b className="block font-display text-h3 leading-none text-bone">{result.counts[0]}</b>
              <small className="mt-2 block text-[0.74rem] text-bone-faint">{tr('To see again')}</small>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-2" aria-label={tr('Answers')}>
            {GRADES.map((g, i) => (
              <li key={g.id} className="flex items-center gap-3 font-mono text-[0.72rem] text-bone-dim">
                <span className="w-12 text-left">{g.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-wash/[0.06]">
                  <i className={clsx('block h-full rounded-full', TONE[i].bar)} style={{ width: `${(result.counts[i] / top) * 100}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{result.counts[i]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-fine text-bone-dim">{dueLeft ? tr('{0} more {1} due.', dueLeft, dueLeft === 1 ? tr('card is') : tr('cards are')) : next ? tr('Next card {0}.', dueIn(next.due, now)) : tr('Everything here is done.')}</p>
      <div className="flex w-full flex-col gap-2">
        {dueLeft > 0 && (
          <Button onClick={onMore} className="w-full justify-center">
            {tr('Keep going')}
          </Button>
        )}
        <Button variant={dueLeft > 0 ? 'ghost' : 'primary'} onClick={onClose} className="w-full justify-center">
          {tr('Done')}
        </Button>
      </div>
    </div>
  );
}

/**
 * A full-screen study session. `cards` are the ones to go through; a card answered "Again" comes back at the end of the
 * session. Every answer is saved as it is given, so closing midway loses nothing, and the last answer can be taken back.
 */
export default function Session({ cards, onClose, onMore }) {
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState([]); // [{ before, grade, requeued }]
  const startedAt = useRef(Date.now());
  const pool = useMemo(() => new Set(cards.map((c) => c.id)), [cards]);
  const leave = useHistoryLayer(true, onClose);

  const card = queue[index];
  const finished = index >= queue.length;
  const labels = useMemo(() => (card ? nextLabels(card) : []), [card]);

  const flip = useCallback(() => {
    if (!card) return;
    setFlipped((value) => !value);
    setRevealed(true);
  }, [card]);

  const answer = useCallback(
    (grade) => {
      if (!card || !revealed) return;
      const after = review(card, grade);
      void flashcards.put(after);
      recordReview(grade);
      navigator.vibrate?.(grade === 0 ? [8, 40, 8] : 8);
      setHistory((h) => [...h, { before: card, grade, requeued: grade === 0 }]);
      if (grade === 0) setQueue((q) => [...q, after]);
      setIndex((i) => i + 1);
      setFlipped(false);
      setRevealed(false);
    },
    [card, revealed]
  );

  const undo = useCallback(() => {
    const last = history.at(-1);
    if (!last) return;
    void flashcards.put(last.before);
    unrecordReview(last.grade);
    if (last.requeued) setQueue((q) => q.slice(0, -1));
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => i - 1);
    setFlipped(false);
    setRevealed(false);
  }, [history]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'Escape') leave();
      else if (finished) return;
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flip();
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) answer(Number(e.key) - 1);
      else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, revealed, flip, answer, undo, leave]);

  const percent = queue.length ? Math.round((index / queue.length) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex animate-fade-in flex-col overflow-y-auto bg-ink-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-label={tr('Flashcard session')} data-session>
      <header className="flex items-center gap-3 px-4 pt-3 pb-2">
        <button type="button" onClick={leave} aria-label={tr('Close the session')} className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-bone-dim transition-transform hover:text-bone active:scale-90">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-wash/[0.07]" role="progressbar" aria-label={tr('Session progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <i className="block h-full rounded-full bg-gradient-to-r from-signal to-[#8a3bff] transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-[0.72rem] text-bone-faint tabular-nums" data-progress>
          {Math.min(index, queue.length)}/{queue.length}
        </span>
        <button type="button" onClick={undo} disabled={!history.length} aria-label={tr('Undo the last answer')} className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-bone-dim transition-transform hover:text-bone active:scale-90 disabled:opacity-30">
          <Undo2 size={17} aria-hidden="true" />
        </button>
      </header>

      {finished ? (
        <Summary grades={history.map((h) => h.grade)} startedAt={startedAt.current} pool={pool} onClose={leave} onMore={onMore} />
      ) : (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-5 px-4 py-4" data-review>
          <Flip key={`${card.id}-${index}`} card={card} flipped={flipped} canSwipe={revealed} onFlip={flip} onSwipe={answer} />

          {revealed ? (
            <div className="grid grid-cols-4 gap-2" role="group" aria-label={tr('How well did you know it?')}>
              {GRADES.map((g, i) => (
                <button key={g.id} type="button" onClick={() => answer(g.id)} title={g.hint} className={clsx('flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 transition-all active:scale-95', TONE[i].ring)} data-grade={g.id}>
                  <b className="text-[0.84rem] font-medium text-bone">{g.label}</b>
                  <small className="font-mono text-[0.62rem] text-bone-faint">{labels[i]}</small>
                </button>
              ))}
            </div>
          ) : (
            <Button onClick={flip} className="w-full justify-center" data-show-answer>
              <RotateCcw size={15} aria-hidden="true" /> {tr('Show the answer')}
            </Button>
          )}
          <p className="hidden text-center font-mono text-[0.66rem] text-bone-faint md:block">{tr('Space to turn the card · 1 to 4 to answer · Z to undo · Esc to close')}</p>
          <p className="text-center font-mono text-[0.66rem] text-bone-faint md:hidden">{revealed ? tr('Drag the card right for Good, left for Again') : tr('Tap the card to turn it over')}</p>
        </div>
      )}
    </div>,
    document.querySelector('.app-shell') ?? document.body
  );
}
