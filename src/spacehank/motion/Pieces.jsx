import { useEffect, useState } from 'react';
import { clsx } from '../../shared/lib/format';

/** A circle that fills to `value` (0..1) when it appears and glides when the value changes. Put an icon or a number inside. */
export function ProgressRing({ value, size = 56, stroke = 4, children, className, label }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className={clsx('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-line-strong" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-signal [transition:stroke-dashoffset_0.9s_var(--ease-out-expo)]"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}

/** A few soft dots that spread from the middle once: for the moment something is finished. Place it in a `relative` box. */
export function Burst({ dots = 12 }) {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: dots }, (_, k) => (
        <i key={k} style={{ '--a': `${(360 / dots) * k}deg`, '--k': k }} />
      ))}
    </span>
  );
}

/** A tick whose stroke is drawn when it appears. */
export function DrawnTick({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={clsx('drawn-tick', className)} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * Wraps a list row so that, when `leaving` turns on, it fades and folds shut and the rows below slide up into its place.
 * The row is still in the DOM until you remove it (after about 350 ms).
 */
export function Leave({ leaving, children, className }) {
  return (
    <div className={clsx('leave', className)} data-leaving={leaving ? 'true' : 'false'}>
      <div>{children}</div>
    </div>
  );
}
