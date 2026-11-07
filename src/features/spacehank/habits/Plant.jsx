import { clsx } from '../../../lib/format';
import { tr } from '../lang';

/** A plant that grows with the streak: the stem gets taller, then leaves, then a flower, then a tree. */
export default function Plant({ stage, wilting, hue, className }) {
  const c = `hsl(${hue} 70% 55%)`;
  const dark = `hsl(${hue} 60% 38%)`;
  const lean = wilting ? 14 : 0;
  return (
    <svg viewBox="0 0 100 110" className={clsx('origin-bottom', className, !wilting && 'animate-[sway_5s_ease-in-out_infinite]')} role="img" aria-label={tr('A {0}{1}', ['seed', 'sprout', 'seedling', 'plant', 'plant in bloom', 'tree'][stage], wilting ? tr(', wilting') : '')} style={{ filter: wilting ? 'saturate(0.35)' : undefined }}>
      <ellipse cx="50" cy="104" rx="26" ry="5" fill="rgb(0 0 0 / 0.35)" />
      <path d="M22 98 Q50 108 78 98 L72 86 Q50 92 28 86 Z" fill="#3a2a22" />
      {/* keyed by the stage: the stem is drawn upward, the leaves open and the flower blooms, on arriving and at each new stage */}
      <g key={stage} transform={`rotate(${lean} 50 88)`}>
        {stage === 0 && <ellipse cx="50" cy="84" rx="5" ry="3.5" fill="#7a5a3c" className="grow-leaf" />}
        {stage >= 1 && <path d="M50 88 Q50 72 50 60" pathLength="1" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" className="grow-stem" />}
        {stage === 1 && <path d="M50 62 Q40 54 36 60 Q44 66 50 62 M50 62 Q60 54 64 60 Q56 66 50 62" fill={c} className="grow-leaf" style={{ '--d': '0.55s' }} />}
        {stage >= 2 && <path d="M50 88 Q50 50 50 38" pathLength="1" stroke={dark} strokeWidth="3.4" strokeLinecap="round" fill="none" className="grow-stem" />}
        {stage >= 2 && <path d="M50 74 Q34 66 30 74 Q42 80 50 74 M50 62 Q66 52 72 60 Q58 68 50 62 M50 50 Q36 42 32 48 Q44 56 50 50" fill={c} className="grow-leaf" style={{ '--d': '0.6s' }} />}
        {stage >= 3 && <path d="M50 40 Q38 28 44 20 Q52 28 50 40 M50 40 Q62 28 56 20 Q48 28 50 40" fill={c} className="grow-leaf" style={{ '--d': '0.8s' }} />}
        {stage >= 4 && (
          <g className="grow-bloom" style={{ '--d': '1s' }}>
            <circle cx="50" cy="26" r="9" fill="#ffd2bd" />
            <circle cx="50" cy="26" r="4" fill="#ff5b2e" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="50" cy="14" rx="4" ry="7" fill="#ff8a5c" transform={`rotate(${a} 50 26)`} />
            ))}
          </g>
        )}
        {stage >= 5 && (
          <g fill={dark} opacity="0.9" className="grow-leaf" style={{ '--d': '0.7s' }}>
            <circle cx="34" cy="48" r="11" />
            <circle cx="66" cy="46" r="12" />
            <circle cx="50" cy="38" r="13" />
          </g>
        )}
      </g>
    </svg>
  );
}
