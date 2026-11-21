import { useRef, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { tr } from '../../core/i18n/lang';

const STAMP = { strong: tr('STRONG'), fair: tr('FAIR'), weak: tr('WEAK') };
const THROW = 90; // pixels of drag that decide

/**
 * The hooks as a deck of cards: drag the top one right to take it as your opening line, left to pass; or use the buttons (and
 * the arrow keys). Each card carries its score as a stamp. Taking one keeps the deck going, so a better one can still win.
 */
export default function HookDeck({ hooks, chosen, onChoose }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [leaving, setLeaving] = useState(null); // 'left' | 'right'
  const start = useRef(null);
  const left = hooks.slice(index, index + 3);

  const decide = (way) => {
    const card = hooks[index];
    if (!card || leaving) return;
    if (way === 'right') onChoose(card.text);
    setLeaving(way);
    window.setTimeout(() => {
      setLeaving(null);
      setDrag({ x: 0, active: false });
      setIndex((i) => i + 1);
    }, 280);
  };

  if (!left.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-8 text-center" data-deck-done>
        <p className="text-fine text-bone-dim">{chosen ? tr('Your opening line: “{0}”', chosen) : tr('You passed on all of them. Write your own in the lab below.')}</p>
        <button type="button" onClick={() => setIndex(0)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[0.72rem] text-bone-dim hover:text-bone">
          <RotateCcw size={12} aria-hidden="true" /> {tr('Deal them again')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-4 outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') decide('right');
        if (e.key === 'ArrowLeft') decide('left');
      }}
      aria-label={tr('Hook deck: right arrow takes the line, left arrow passes')}
      data-hook-deck
    >
      <div className="cl-deck">
        {left
          .map((h, depth) => {
            const top = depth === 0;
            const x = top ? (leaving === 'right' ? 520 : leaving === 'left' ? -520 : drag.x) : 0;
            const lean = Math.max(-1, Math.min(1, x / 240));
            return (
              <article
                key={index + depth}
                className={clsx('cl-deck-card', top && 'is-top', top && drag.active && 'is-dragging', chosen === h.text && 'is-chosen')}
                style={{ '--depth': depth, transform: top ? `translateX(${x}px) rotate(${lean * 14}deg)` : undefined }}
                onPointerDown={
                  top
                    ? (e) => {
                        start.current = e.clientX;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrag({ x: 0, active: true });
                      }
                    : undefined
                }
                onPointerMove={top ? (e) => start.current !== null && setDrag({ x: e.clientX - start.current, active: true }) : undefined}
                onPointerUp={
                  top
                    ? () => {
                        start.current = null;
                        if (drag.x > THROW) decide('right');
                        else if (drag.x < -THROW) decide('left');
                        else setDrag({ x: 0, active: false });
                      }
                    : undefined
                }
                aria-hidden={!top}
              >
                <span className={clsx('cl-deck-stamp', `is-${h.label}`)}>
                  {STAMP[h.label]} · {h.score}
                </span>
                <p className="cl-deck-line">“{h.text}”</p>
                <small className="font-mono text-[0.66rem] text-bone-faint">
                  {index + depth + 1} / {hooks.length}
                  {h.formula && ` · ${h.formula}`}
                </small>
                {top && (
                  <>
                    <i className="cl-deck-yes" style={{ opacity: Math.max(0, lean) }} aria-hidden="true">
                      {tr('TAKE')}
                    </i>
                    <i className="cl-deck-no" style={{ opacity: Math.max(0, -lean) }} aria-hidden="true">
                      {tr('PASS')}
                    </i>
                  </>
                )}
              </article>
            );
          })
          .reverse()}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => decide('left')} className="cl-deck-btn" aria-label={tr('Pass')}>
          <X size={20} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => decide('right')} className="cl-deck-btn is-yes" aria-label={tr('Take this line')}>
          <Check size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
