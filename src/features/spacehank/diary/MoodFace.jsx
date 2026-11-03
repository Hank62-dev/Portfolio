// A little round face for each mood, in muted colours: tired, a bit sad, so-so, content, great.

export const MOOD_COLORS = ['#7d93b5', '#9a92bd', '#bfb094', '#d9a75f', '#e6c25a'];
const PLUM = '#1b2433';

const FACES = [
  // 1 tired: heavy lids, a flat mouth
  <>
    <path d="M13 20.5 q3.5 2.6 7 0 M28 20.5 q3.5 2.6 7 0" />
    <path d="M18.5 31.5 h11" />
  </>,
  // 2 a bit sad: small eyes, a little frown
  <>
    <circle cx="16.5" cy="20.5" r="1.7" fill={PLUM} stroke="none" />
    <circle cx="31.5" cy="20.5" r="1.7" fill={PLUM} stroke="none" />
    <path d="M18 32.5 q6 -4.5 12 0" />
  </>,
  // 3 so-so: round eyes, a straight mouth
  <>
    <circle cx="16.5" cy="20.5" r="1.9" fill={PLUM} stroke="none" />
    <circle cx="31.5" cy="20.5" r="1.9" fill={PLUM} stroke="none" />
    <path d="M18.5 31 q5.5 1.5 11 0" />
  </>,
  // 4 happy: bright eyes, a smile
  <>
    <circle cx="16.5" cy="20" r="1.9" fill={PLUM} stroke="none" />
    <circle cx="31.5" cy="20" r="1.9" fill={PLUM} stroke="none" />
    <path d="M16.5 28.5 q7.5 8.5 15 0" />
  </>,
  // 5 very happy: closed smiling eyes, an open grin, rosy cheeks
  <>
    <path d="M13 21.5 q3.5 -4.5 7 0 M28 21.5 q3.5 -4.5 7 0" />
    <path d="M15.5 27.5 q8.5 12 17 0 z" fill="#7d3a32" stroke={PLUM} />
  </>,
];

/** `mood` is 1 to 5; with no mood it is an empty, dotted circle. `ring` draws a soft outline around it. */
export default function MoodFace({ mood, size = 44, ring = false, className }) {
  if (!mood) {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="rgb(255 255 255 / 0.06)" stroke="#a3bcd9" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill={MOOD_COLORS[mood - 1]} stroke={ring ? '#eef3f7' : 'none'} strokeWidth="3" />
      <ellipse cx="17" cy="12" rx="8" ry="4" fill="#fff" opacity="0.18" transform="rotate(-18 17 12)" />
      <g fill="none" stroke={PLUM} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {FACES[mood - 1]}
      </g>
    </svg>
  );
}
