import { useId } from 'react';
import { clsx } from '../../shared/lib/format';
import { tr } from '../lang';

// A leaf that points to the right from its stem (0,0); it is turned and sized where it is used.
const LEAF = 'M0 0 C5 -5 15 -6 21 -1 C15 5 5 5 0 0Z';
const VEIN = 'M1 0 Q11 -1.2 18 -1';

/** One leaf on the stem: placed with an outer transform, so the grow animation (a transform too) can play on the inner one. */
function Leaf({ x, y, turn, size = 1, delay, fill }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${size})`}>
      <g className="grow-leaf" style={{ '--d': delay }}>
        <path d={LEAF} fill={fill} />
        <path d={VEIN} stroke="rgb(255 255 255 / 0.4)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

/**
 * A plant in a clay pot that grows with the streak: a seed in the soil, a sprout, a seedling with leaves, a plant, one in
 * bloom, then a small tree. Leaves and petals have a light side and a dark side, and the pot has a rim and a highlight.
 */
export default function Plant({ stage, wilting, hue, className }) {
  const id = useId().replace(/:/g, '');
  const light = `hsl(${hue} 70% 66%)`;
  const mid = `hsl(${hue} 62% 48%)`;
  const dark = `hsl(${hue} 58% 32%)`;
  const lean = wilting ? 16 : 0;
  const leaf = `url(#leaf-${id})`;
  return (
    <svg viewBox="0 0 100 110" className={clsx('origin-bottom', className, !wilting && 'animate-[sway_5s_ease-in-out_infinite]')} role="img" aria-label={tr('A {0}{1}', ['seed', 'sprout', 'seedling', 'plant', 'plant in bloom', 'tree'][stage], wilting ? tr(', wilting') : '')} style={{ filter: wilting ? 'saturate(0.35) brightness(0.92)' : undefined }}>
      <defs>
        <linearGradient id={`leaf-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={`crown-${id}`} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor={light} />
          <stop offset="0.6" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`pot-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8714c" />
          <stop offset="0.45" stopColor="#e0916a" />
          <stop offset="1" stopColor="#9c4f33" />
        </linearGradient>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d98160" />
          <stop offset="0.45" stopColor="#f0a583" />
          <stop offset="1" stopColor="#b2603f" />
        </linearGradient>
        <radialGradient id={`petal-${id}`} cx="0.5" cy="0.85" r="0.9">
          <stop offset="0" stopColor="#ff6a3a" />
          <stop offset="1" stopColor="#ffb08a" />
        </radialGradient>
      </defs>

      <ellipse cx="50" cy="107" rx="27" ry="3.6" fill="rgb(0 0 0 / 0.32)" />
      {/* the pot: a tapered body, a rim, soil, and a highlight */}
      <path d="M28 87 H72 L67.5 104 Q66.8 107 64 107 H36 Q33.2 107 32.5 104 Z" fill={`url(#pot-${id})`} />
      <path d="M33 90 L36 103" stroke="rgb(255 255 255 / 0.28)" strokeWidth="2" strokeLinecap="round" />
      <rect x="23" y="80" width="54" height="9" rx="4.5" fill={`url(#rim-${id})`} />
      <ellipse cx="50" cy="81.6" rx="25" ry="2.9" fill="#3a2a20" />

      {/* keyed by the stage: the stem is drawn upward, the leaves open and the flower blooms, on arriving and at each new stage */}
      <g key={stage} transform={`rotate(${lean} 50 82)`}>
        {stage === 0 && (
          <g className="grow-leaf">
            <path d="M38 82 Q50 73 62 82 Z" fill="#4a3426" />
            <ellipse cx="50" cy="79.5" rx="4.2" ry="2.8" fill="#9a7550" />
            <path d="M48 78.8 Q50 78 52 79" stroke="rgb(255 255 255 / 0.4)" strokeWidth="0.7" strokeLinecap="round" fill="none" />
          </g>
        )}
        {stage >= 1 && stage < 5 && <path d={stage === 1 ? 'M50 82 Q50 70 50 60' : 'M50 82 Q49 62 50 42'} pathLength="1" stroke={dark} strokeWidth={stage === 1 ? 3 : 3.4} strokeLinecap="round" fill="none" className="grow-stem" />}
        {stage === 1 && (
          <>
            <Leaf x={50} y={61} turn={-148} size={0.8} delay="0.55s" fill={leaf} />
            <Leaf x={50} y={61} turn={-32} size={0.8} delay="0.65s" fill={leaf} />
          </>
        )}
        {stage >= 2 && stage < 5 && (
          <>
            <Leaf x={50} y={74} turn={-150} size={0.95} delay="0.5s" fill={leaf} />
            <Leaf x={50} y={65} turn={-30} size={1.05} delay="0.6s" fill={leaf} />
            <Leaf x={50} y={55} turn={-152} size={0.95} delay="0.7s" fill={leaf} />
          </>
        )}
        {stage >= 3 && stage < 5 && (
          <>
            <Leaf x={50} y={46} turn={-28} size={0.9} delay="0.8s" fill={leaf} />
            <Leaf x={50} y={42} turn={-122} size={0.85} delay="0.9s" fill={leaf} />
            <Leaf x={50} y={42} turn={-62} size={0.85} delay="0.95s" fill={leaf} />
          </>
        )}
        {stage === 4 && (
          <g className="grow-bloom" style={{ '--d': '1s' }}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="50" cy="22" rx="4.6" ry="8" fill={`url(#petal-${id})`} transform={`rotate(${a} 50 30)`} />
            ))}
            <circle cx="50" cy="30" r="5.2" fill="#ffd45c" />
            <circle cx="48.4" cy="28.6" r="1.6" fill="rgb(255 255 255 / 0.55)" />
          </g>
        )}
        {stage >= 5 && (
          <>
            <path d="M50 82 Q48 66 50 50" pathLength="1" stroke="#6b4a33" strokeWidth="6" strokeLinecap="round" fill="none" className="grow-stem" />
            <path d="M50 66 Q40 60 36 54 M50 62 Q60 56 64 50" stroke="#6b4a33" strokeWidth="2.6" strokeLinecap="round" fill="none" className="grow-stem" />
            <g className="grow-leaf" style={{ '--d': '0.7s' }}>
              <circle cx="33" cy="48" r="13" fill={`url(#crown-${id})`} />
              <circle cx="67" cy="46" r="14" fill={`url(#crown-${id})`} />
              <circle cx="50" cy="35" r="17" fill={`url(#crown-${id})`} />
              <circle cx="44" cy="30" r="5" fill="rgb(255 255 255 / 0.14)" />
              <circle cx="60" cy="42" r="2.4" fill="#ff6a3a" />
              <circle cx="38" cy="44" r="2.2" fill="#ff8a5c" />
              <circle cx="52" cy="26" r="2" fill="#ff6a3a" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
