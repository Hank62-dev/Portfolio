import { clsx } from '../../shared/lib/format';

// Small drawings for an empty place, in the same hand: a few lines, one warm accent, the tab's colour for the rest.
const ART = {
  garden: (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="80" cy="110" rx="58" ry="6" className="sh-shadow" />
      <path d="M52 72h56l-7 36H59z" className="sh-pot" />
      <rect x="48" y="66" width="64" height="10" rx="3" className="sh-pot-rim" />
      <path d="M80 66V40" className="sh-line" />
      <path d="M80 50c-12-2-20-10-20-20 12 0 20 8 20 20z" className="sh-leaf" />
      <path d="M80 42c10-2 17-9 17-18-10 0-17 7-17 18z" className="sh-leaf sh-leaf-2" />
      <circle cx="122" cy="26" r="9" className="sh-sun" />
      <path d="M30 34h14M37 27v14" className="sh-spark" />
    </svg>
  ),
  jar: (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="80" cy="112" rx="50" ry="5" className="sh-shadow" />
      <rect x="58" y="14" width="44" height="12" rx="4" className="sh-pot-rim" />
      <path d="M60 26v6c-8 5-12 12-12 22v44c0 7 5 12 12 12h40c7 0 12-5 12-12V54c0-10-4-17-12-22v-6z" className="sh-glass" />
      <ellipse cx="72" cy="100" rx="10" ry="4" className="sh-coin" />
      <ellipse cx="90" cy="102" rx="10" ry="4" className="sh-coin" />
      <ellipse cx="128" cy="40" rx="10" ry="4" className="sh-coin sh-coin-fall" />
      <path d="M58 60v30" className="sh-shine" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="80" cy="112" rx="58" ry="5" className="sh-shadow" />
      <rect x="28" y="20" width="104" height="80" rx="6" className="sh-board" />
      <rect x="40" y="32" width="34" height="32" rx="2" className="sh-note" transform="rotate(-5 57 48)" />
      <rect x="84" y="38" width="34" height="32" rx="2" className="sh-note sh-note-2" transform="rotate(4 101 54)" />
      <circle cx="57" cy="32" r="3.5" className="sh-pin" />
      <circle cx="101" cy="38" r="3.5" className="sh-pin" />
      <path d="M46 46h22M46 52h16" className="sh-line" transform="rotate(-5 57 48)" />
    </svg>
  ),
};

/**
 * What an empty place shows: a small drawing, a sentence of what it is for, the main way in (`action`) and a few ready-made
 * starts (`starts`: [{ label, run }]) so the first step is one tap.
 */
export default function StartHere({ art, title, text, action, starts = [], startsLabel, className }) {
  return (
    <div className={clsx('start-here', className)} data-start-here>
      <span className="start-art">{ART[art]}</span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[1.6rem] leading-tight text-bone">{title}</h2>
        {text && <p className="mt-1 max-w-md text-fine text-bone-dim">{text}</p>}
        {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
        {starts.length > 0 && (
          <div className="mt-4">
            {startsLabel && <small className="mb-2 block font-mono text-[0.64rem] tracking-[0.14em] text-bone-faint uppercase">{startsLabel}</small>}
            <div className="flex flex-wrap gap-2">
              {starts.map((start) => (
                <button key={start.label} type="button" onClick={start.run} className="start-chip">
                  {start.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
