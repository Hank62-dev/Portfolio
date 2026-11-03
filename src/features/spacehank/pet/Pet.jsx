import { clsx } from '../../../lib/format';

// Mơ, drawn in a 120 by 120 box: a round apricot with a leaf on top. Her face follows her mood; what she wears follows how
// far she has grown. The animations (a slow bob, a blink, a wave) are plain CSS in styles/index.css and stop for anyone who
// asked their phone for less motion.

const INK = '#4a2f3a';
const BODY = 'url(#mo-body)';

const Eyes = ({ mood }) => {
  switch (mood) {
    case 'happy':
      return <path d="M42 62 q6 -9 12 0 M66 62 q6 -9 12 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
    case 'sleepy':
      return <path d="M42 62 q6 6 12 0 M66 62 q6 6 12 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
    case 'excited':
      return (
        <g fill={INK}>
          <circle cx="48" cy="62" r="6" />
          <circle cx="72" cy="62" r="6" />
          <circle cx="50" cy="60" r="2.2" fill="#fff" />
          <circle cx="74" cy="60" r="2.2" fill="#fff" />
        </g>
      );
    case 'lonely':
      return (
        <g fill={INK}>
          <circle cx="48" cy="64" r="4.2" />
          <circle cx="72" cy="64" r="4.2" />
          <circle cx="49.5" cy="62.5" r="1.4" fill="#fff" />
          <circle cx="73.5" cy="62.5" r="1.4" fill="#fff" />
        </g>
      );
    default:
      return (
        <g className="pet-blink" fill={INK}>
          <circle cx="48" cy="62" r="4.6" />
          <circle cx="72" cy="62" r="4.6" />
          <circle cx="49.7" cy="60.3" r="1.5" fill="#fff" />
          <circle cx="73.7" cy="60.3" r="1.5" fill="#fff" />
        </g>
      );
  }
};

const Mouth = ({ mood }) => {
  switch (mood) {
    case 'happy':
      return <path d="M52 76 q8 9 16 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
    case 'excited':
      return <path d="M50 75 q10 16 20 0 z" fill="#c2554f" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />;
    case 'sleepy':
      return <ellipse cx="60" cy="79" rx="3" ry="2.4" fill={INK} />;
    case 'worried':
      return <path d="M53 80 q3 -3 7 0 q4 3 7 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
    case 'lonely':
      return <path d="M53 82 q7 -6 14 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />;
    default:
      return <path d="M54 77 q6 4 12 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />;
  }
};

/** `mood`: calm | happy | excited | sleepy | worried | lonely. `outfit`: { scarf, backpack, hat, star }. */
export default function Pet({ mood = 'calm', outfit = {}, size = 120, className, waving = false, label }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={clsx('pet overflow-visible', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <radialGradient id="mo-body" cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffd9b8" />
          <stop offset="0.6" stopColor="#ffbd91" />
          <stop offset="1" stopColor="#f59a72" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="108" rx="28" ry="5" fill="#000" opacity="0.14" />
      <g className="pet-bob">
        {outfit.backpack && (
          <g>
            <rect x="82" y="68" width="18" height="28" rx="7" fill="#f2b84b" />
            <rect x="85" y="74" width="12" height="9" rx="3" fill="#e2a03a" />
          </g>
        )}
        {/* feet and arms */}
        <ellipse cx="46" cy="101" rx="9" ry="5" fill="#f59a72" />
        <ellipse cx="74" cy="101" rx="9" ry="5" fill="#f59a72" />
        <circle cx="25" cy="78" r="6.5" fill="#f59a72" />
        <circle cx="95" cy="78" r="6.5" fill="#f59a72" className={waving ? 'pet-wave' : undefined} />
        {/* body */}
        <ellipse cx="60" cy="70" rx="38" ry="35" fill={BODY} />
        <path d="M60 36 q-3 14 0 22" fill="none" stroke="#f59a72" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        {/* leaf, or a straw hat for the explorer */}
        {outfit.hat ? (
          <g>
            <ellipse cx="60" cy="40" rx="34" ry="8" fill="#f0cd7a" />
            <path d="M40 40 q0 -22 20 -22 q20 0 20 22 z" fill="#f6dd96" />
            <path d="M40 38 q20 5 40 0" fill="none" stroke="#e58d6a" strokeWidth="4" />
          </g>
        ) : (
          <g>
            <path d="M60 36 q-16 -4 -20 -18 q16 -2 20 18 z" fill="#7cc8a0" />
            <path d="M60 36 q16 -4 20 -18 q-16 -2 -20 18 z" fill="#5fb68a" />
          </g>
        )}
        {/* face */}
        <ellipse cx="38" cy="74" rx="7" ry="4.6" fill="#ff8f8f" opacity="0.5" />
        <ellipse cx="82" cy="74" rx="7" ry="4.6" fill="#ff8f8f" opacity="0.5" />
        {mood === 'worried' && <path d="M40 54 l12 4 M80 54 l-12 4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />}
        <Eyes mood={mood} />
        <Mouth mood={mood} />
        {mood === 'lonely' && <path d="M45 72 q-3 6 0 9 q3 -3 0 -9 z" fill="#8ec5ff" opacity="0.9" />}
        {mood === 'sleepy' && (
          <g fill="none" stroke="#8a6f8f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="pet-z">
            <path d="M88 38 h9 l-9 10 h9" />
            <path d="M100 24 h6 l-6 7 h6" opacity="0.7" />
          </g>
        )}
        {mood === 'excited' && (
          <g fill="#ffd35e">
            <path d="M18 40 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 z" />
            <path d="M102 34 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
          </g>
        )}
        {/* scarf */}
        {outfit.scarf && (
          <g>
            <path d="M28 92 q32 14 64 0 l-1 9 q-31 13 -62 0 z" fill="#7cc4b5" />
            <path d="M74 98 l8 16 l-9 1 l-4 -14 z" fill="#68b2a3" />
          </g>
        )}
        {outfit.star && <path d="M60 4 l3.4 8 8.6 1 -6.4 5.8 1.8 8.4 -7.4 -4.4 -7.4 4.4 1.8 -8.4 -6.4 -5.8 8.6 -1 z" fill="#ffd35e" stroke="#f0a93a" strokeWidth="1.4" strokeLinejoin="round" />}
      </g>
    </svg>
  );
}
