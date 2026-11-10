import { clsx } from '../../shared/lib/format';

// Niú, drawn in a 120 by 120 box: a little panda sitting down, a big round head with fluffy cheeks, big dark eye patches and
// a white V on its chest. Its face follows its mood; what it wears follows how far it has grown. The animations (a slow bob,
// a blink) are plain CSS in styles/index.css and stop for anyone who asked their phone for less motion.

const INK = '#4a2f3a';
// the black of the fur is a soft charcoal with a faint rim, so the ears, body and paws still read on the dark cards
const FUR = '#26232a';
const RIM = '#5d5866';
const FUR_PROPS = { fill: 'url(#niu-fur)', stroke: RIM, strokeWidth: 1.2 };
const WHITE = 'url(#niu-white)';
const EDGE = '#cfc7ba';

// The eyes sit on the two dark patches, so they are drawn light.
const Eye = ({ x, mood, blink }) => {
  switch (mood) {
    case 'happy':
      return <path d={`M${x - 6} 52 q6 -9 12 0`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />;
    case 'sleepy':
      return <path d={`M${x - 6} 48 q6 6 12 0`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />;
    case 'excited':
      return (
        <g>
          <circle cx={x} cy="50" r="7" fill="#fff" />
          <circle cx={x} cy="50.8" r="4.4" fill={FUR} />
          <circle cx={x + 1.9} cy="48.4" r="1.8" fill="#fff" />
        </g>
      );
    case 'lonely':
      return (
        <g>
          <circle cx={x} cy="51" r="6.2" fill="#fff" />
          <circle cx={x} cy="52" r="3.9" fill={FUR} />
          <circle cx={x + 1.7} cy="50" r="1.7" fill="#fff" />
        </g>
      );
    default:
      return (
        <g className={blink ? 'pet-blink' : undefined}>
          <circle cx={x} cy="50" r="6" fill="#fff" />
          <circle cx={x} cy="50.8" r="3.6" fill={FUR} />
          <circle cx={x + 1.5} cy="48.8" r="1.4" fill="#fff" />
        </g>
      );
  }
};

const Brows = ({ mood }) => {
  if (mood === 'worried' || mood === 'lonely') return <path d="M31 38 l13 -6 M89 38 l-13 -6" stroke={FUR} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
  if (mood === 'sleepy' || mood === 'happy') return null;
  const lift = mood === 'excited' ? -3 : 0;
  return <path d={`M33 ${33 + lift} q6 -5 12 -1 M87 ${33 + lift} q-6 -5 -12 -1`} stroke={FUR} strokeWidth="2.2" strokeLinecap="round" fill="none" />;
};

const Mouth = ({ mood }) => {
  switch (mood) {
    case 'happy':
      return <path d="M51 65 q9 10 18 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
    case 'excited':
      return <path d="M51 65 q9 15 18 0 z" fill="#c2554f" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />;
    case 'sleepy':
      return <ellipse cx="60" cy="68" rx="2.8" ry="2.4" fill={INK} />;
    case 'worried':
      return <path d="M53 69 q3 -3 7 0 q4 3 7 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
    case 'lonely':
      return <path d="M53 70 q7 -6 14 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />;
    default:
      return <path d="M52 65 q8 8 16 0" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />;
  }
};

// a hind paw seen from the front: the sole faces out, with a big pad and three toes
const HindPaw = ({ side }) => {
  const x = side === 'left' ? 21 : 99;
  const dir = side === 'left' ? 1 : -1;
  return (
    <g>
      <ellipse cx={x} cy="97" rx="13" ry="12.5" {...FUR_PROPS} />
      <ellipse cx={x + dir * 0.5} cy="100" rx="7" ry="6.4" fill="#fff" />
      <circle cx={x - dir * 6.5} cy="90.5" r="2.4" fill="#fff" />
      <circle cx={x - dir * 0.5} cy="88" r="2.4" fill="#fff" />
      <circle cx={x + dir * 5.5} cy="89.5" r="2.4" fill="#fff" />
    </g>
  );
};

// a front paw resting on the ground, with three claws
const FrontPaw = ({ x }) => (
  <g>
    <ellipse cx={x} cy="103" rx="11.5" ry="8" {...FUR_PROPS} />
    <path d={`M${x - 6} 107 v2.4 M${x} 108 v2.6 M${x + 6} 107 v2.4`} stroke="#8a8492" strokeWidth="1.4" strokeLinecap="round" />
  </g>
);

/** `mood`: calm | happy | excited | sleepy | worried | lonely. `outfit`: { scarf, backpack, hat, star }. */
export default function Pet({ mood = 'calm', outfit = {}, size = 120, className, label }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={clsx('pet overflow-visible', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <radialGradient id="niu-fur" cx="34%" cy="26%" r="90%">
          <stop offset="0" stopColor="#3d3944" />
          <stop offset="0.55" stopColor="#26232a" />
          <stop offset="1" stopColor="#18161c" />
        </radialGradient>
        <linearGradient id="niu-bamboo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b6dc7a" />
          <stop offset="0.5" stopColor="#7fb64e" />
          <stop offset="1" stopColor="#4f8a37" />
        </linearGradient>
        <radialGradient id="niu-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#ffd35e" stopOpacity="0" />
          <stop offset="0.85" stopColor="#ffd35e" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffd35e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="niu-white" cx="38%" cy="28%" r="85%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#f6f2ec" />
          <stop offset="1" stopColor="#e2dbd0" />
        </radialGradient>
      </defs>
      {outfit.star && <circle cx="60" cy="62" r="64" fill="url(#niu-aura)" className="pet-aura" />}
      <ellipse cx="60" cy="112" rx="38" ry="5" fill="#000" opacity="0.16" />
      <g className="pet-bob">
        {outfit.backpack && (
          <g>
            <rect x="86" y="70" width="19" height="30" rx="7" fill="#f2b84b" />
            <rect x="89" y="77" width="13" height="10" rx="3" fill="#e2a03a" />
          </g>
        )}
        {/* body: dark, with a white V on the chest */}
        <path d="M27 98 Q22 72 44 68 L76 68 Q98 72 93 98 Q90 112 60 112 Q30 112 27 98 Z" {...FUR_PROPS} />
        <path d="M46 78 Q60 86 74 78 L66 104 Q60 108 54 104 Z" fill="#fff" />
        <HindPaw side="left" />
        <HindPaw side="right" />
        {(mood === 'calm' || mood === 'happy' || mood === 'worried') && (
          <g className="pet-bamboo">
            <rect x="24" y="97.5" width="72" height="7.5" rx="3.75" fill="url(#niu-bamboo)" stroke="#3f7030" strokeWidth="0.8" />
            <path d="M42 97.5 v7.5 M60 97.5 v7.5 M78 97.5 v7.5" stroke="#3f7030" strokeWidth="1.2" />
            <path d="M94 99 q9 -4 12 -12 q-9 1 -12 12z M92 99 q4 -10 -1 -17 q-6 8 1 17z" fill="#8fc45c" stroke="#4f8a37" strokeWidth="0.8" strokeLinejoin="round" className="pet-leaf" />
          </g>
        )}
        <FrontPaw x={45} />
        <FrontPaw x={75} />
        <g className="pet-head">
        {/* ears, behind the head, each with a softer inside; they twitch now and then */}
        <g className="pet-ear pet-ear-l">
          <circle cx="24" cy="25" r="14" {...FUR_PROPS} />
          <ellipse cx="25" cy="27" rx="7" ry="6.4" fill="#5b4a59" opacity="0.75" />
        </g>
        <g className="pet-ear pet-ear-r">
          <circle cx="96" cy="25" r="14" {...FUR_PROPS} />
          <ellipse cx="95" cy="27" rx="7" ry="6.4" fill="#5b4a59" opacity="0.75" />
        </g>
        {/* fluffy tufts on the cheeks and the crown, then the head */}
        <path d="M21 48 l-7 5 l8 2 l-6 7 l10 -2 z M99 48 l7 5 l-8 2 l6 7 l-10 -2 z M52 15 q5 -9 10 -2 q4 -6 8 3 z" fill={WHITE} stroke={EDGE} strokeWidth="1.2" strokeLinejoin="round" />
        <ellipse cx="60" cy="46" rx="42" ry="34" fill={WHITE} stroke={EDGE} strokeWidth="1.2" />
        {outfit.sprout && (
          <g className="pet-sprout">
            <path d="M60 14 q-1.5 -5 1 -10" stroke="#4f8a37" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M61 6 q-9 -7 -16 -2 q8 7 16 2z" fill="url(#niu-bamboo)" stroke="#4f8a37" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M61 6 q8 -8 16 -4 q-6 8 -16 4z" fill="#a3d36b" stroke="#4f8a37" strokeWidth="0.8" strokeLinejoin="round" />
          </g>
        )}
        {/* a straw hat for the explorer */}
        {outfit.hat && (
          <g>
            <ellipse cx="60" cy="19" rx="36" ry="8" fill="#f0cd7a" />
            <path d="M42 19 q0 -20 18 -20 q18 0 18 20 z" fill="#f6dd96" />
            <path d="M42 17 q18 5 36 0" fill="none" stroke="#e58d6a" strokeWidth="4" />
          </g>
        )}
        {/* face: two tilted dark patches, the eyes on them, a nose, a mouth */}
        <ellipse cx="38" cy="51" rx="13" ry="15" fill={FUR} transform="rotate(-22 38 51)" />
        <ellipse cx="82" cy="51" rx="13" ry="15" fill={FUR} transform="rotate(22 82 51)" />
        <ellipse cx="26" cy="66" rx="5.5" ry="3.6" fill="#ff8f8f" opacity="0.2" />
        <ellipse cx="94" cy="66" rx="5.5" ry="3.6" fill="#ff8f8f" opacity="0.2" />
        <Brows mood={mood} />
        <Eye x={40} mood={mood} blink />
        <Eye x={80} mood={mood} />
        <path d="M54 56 q6 -4 12 0 q-1 5.5 -6 7 q-5 -1.5 -6 -7 z" fill={FUR} />
        <Mouth mood={mood} />
        {mood === 'lonely' && <path d="M34 62 q-3 6 0 9 q3 -3 0 -9 z" fill="#8ec5ff" opacity="0.9" />}
        {mood === 'sleepy' && (
          <g fill="none" stroke="#b9a6c0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="pet-z" transform="translate(14 -8)">
            <path d="M88 38 h9 l-9 10 h9" />
            <path d="M100 24 h6 l-6 7 h6" opacity="0.7" />
          </g>
        )}
        {mood === 'excited' && (
          <g fill="#ffd35e">
            <path d="M18 40 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 z" transform="translate(-12 -28)" />
            <path d="M102 34 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" transform="translate(10 -20)" />
          </g>
        )}
        </g>
        {/* scarf */}
        {outfit.scarf && (
          <g>
            {/* the band wraps the neck just under the chin (it follows the curve of the head) and a small knot sits in the middle */}
            <path d="M31 73 Q60 82 89 73 L87 82 Q60 92 33 82 Z" fill="#2a4ba6" />
            <path d="M33 82 Q60 92 87 82" fill="none" stroke="#1d3680" strokeWidth="1.2" />
            <ellipse cx="60" cy="84.5" rx="5.5" ry="4.2" fill="#2a4ba6" stroke="#1d3680" strokeWidth="1" />
          </g>
        )}
        {outfit.star && <path d="M60 4 l3.4 8 8.6 1 -6.4 5.8 1.8 8.4 -7.4 -4.4 -7.4 4.4 1.8 -8.4 -6.4 -5.8 8.6 -1 z" fill="#ffd35e" stroke="#f0a93a" strokeWidth="1.4" strokeLinejoin="round" transform="translate(60 8) scale(0.55) translate(-60 -15)" />}
      </g>
    </svg>
  );
}
