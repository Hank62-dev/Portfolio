// A little panda for each mood, drawn like a sticker: a round head with a white edge and two dark ears over a disc whose colour says
// the mood. Kept plain on purpose: the eyes and the mouth tell how the day was, with one small thing where it helps (a z when tired,
// a raincloud when sad, sunglasses when it was a great day).

export const MOOD_COLORS = ['#667b9f', '#8480b3', '#a99f80', '#d99a45', '#e0b038'];
const FUR = '#22202a';
const HEAD = '#fbf9f4';
const OUT = '#ffffff';

// every shape of the panda is drawn once in white with a thick stroke, then again on top: that is the sticker edge
const Shapes = ({ pass, fillId }) => {
  const white = pass === 'edge';
  const edge = white ? { stroke: OUT, strokeWidth: 3, strokeLinejoin: 'round' } : {};
  return (
    <>
      <circle cx="24" cy="26.5" r="21.5" fill={white ? OUT : `url(#${fillId})`} {...edge} />
      <circle cx="11" cy="13.4" r="6.2" fill={white ? OUT : FUR} {...edge} />
      <circle cx="37" cy="13.4" r="6.2" fill={white ? OUT : FUR} {...edge} />
      <ellipse cx="24" cy="30.9" rx="16" ry="13.2" fill={white ? OUT : HEAD} {...edge} />
    </>
  );
};

// the eyes sit on the dark patches, so they are drawn light
const Eye = ({ x, kind }) => {
  switch (kind) {
    case 'lid': // tired: a heavy lid
      return <path d={`M${x - 3.4} 29.4 q3.4 2.6 6.8 0`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
    case 'sad': // a wide eye looking down
      return (
        <g>
          <ellipse cx={x} cy="28.6" rx="3.2" ry="3.7" fill="#fff" />
          <circle cx={x} cy="29.6" r="2.2" fill={FUR} />
        </g>
      );
    case 'hidden': // behind the sunglasses
      return null;
    default:
      return (
        <g>
          <ellipse cx={x} cy="28.4" rx="3.3" ry="3.8" fill="#fff" />
          <circle cx={x} cy="29" r="2.3" fill={FUR} />
          <circle cx={x - 0.8} cy="27.7" r="0.8" fill="#fff" />
        </g>
      );
  }
};

const FACES = [
  // 1 tired
  { eyes: 'lid', mouth: <path d="M21.4 38 h5.2" fill="none" stroke={FUR} strokeWidth="1.8" strokeLinecap="round" /> },
  // 2 a bit sad
  { eyes: 'sad', mouth: <path d="M21 38.8 q3 -2.6 6 0" fill="none" stroke={FUR} strokeWidth="1.8" strokeLinecap="round" /> },
  // 3 so-so
  { eyes: 'open', mouth: <path d="M21.4 37.6 h5.2" fill="none" stroke={FUR} strokeWidth="1.8" strokeLinecap="round" /> },
  // 4 happy: a calm smile
  { eyes: 'open', mouth: <path d="M20.8 36.8 q3.2 3.6 6.4 0" fill="none" stroke={FUR} strokeWidth="1.9" strokeLinecap="round" /> },
  // 5 great: a grin behind sunglasses
  { eyes: 'hidden', mouth: <path d="M20.4 36.2 q3.6 5.2 7.2 0z" fill="#fff" stroke={FUR} strokeWidth="1.5" strokeLinejoin="round" /> },
];

// what each mood has near it, drawn over the head
const EXTRAS = [
  <path key="1" d="M23 5.6 h5 l-5 5.6 h5 M31 1.4 h3.6 l-3.6 4 h3.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />,
  <g key="2">
    <path d="M26 9.4 a4.2 4.2 0 0 1 7.6 -1.8 a3.5 3.5 0 0 1 4.6 3.2 a3 3 0 0 1 -1 5.4 h-10.2 a3.4 3.4 0 0 1 -1 -6.8z" fill="#cdd6e8" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
    <path d="M30 19 q-1 1.6 0 2.4 q1 -.8 0 -2.4 M35 19 q-1 1.6 0 2.4 q1 -.8 0 -2.4" fill="#6fb3ff" />
  </g>,
  null,
  null,
  // sunglasses: two dark lenses and a bridge, with a glint
  <g key="5">
    <rect x="8.6" y="25.8" width="13.6" height="8.4" rx="3.6" fill="#15141b" stroke="#fff" strokeWidth="0.8" />
    <rect x="25.8" y="25.8" width="13.6" height="8.4" rx="3.6" fill="#15141b" stroke="#fff" strokeWidth="0.8" />
    <path d="M22.2 29.4 h3.6" stroke="#15141b" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11.4 28 l3.6 0 M28.6 28 l3.6 0" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
  </g>,
];

/**
 * `mood` is 1 to 5; with no mood it is an empty panda drawn in dots. `ring` draws a soft outline around the disc, and `color`
 * paints the disc another colour (the amber of today's stone).
 */
export default function MoodFace({ mood, size = 44, ring = false, color, className }) {
  if (!mood) {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
        <g fill="none" stroke="var(--dz-text-3)" strokeWidth="1.8" strokeDasharray="2 4.2" strokeLinecap="round">
          <circle cx="11" cy="13.6" r="6" />
          <circle cx="37" cy="13.6" r="6" />
          <ellipse cx="24" cy="30.9" rx="15.6" ry="12.8" />
        </g>
        <path d="M18.6 31 q2.8 -1.8 5.4 0 M24 31 q2.8 -1.8 5.4 0" fill="none" stroke="var(--dz-text-3)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }
  const tone = color ?? MOOD_COLORS[mood - 1];
  const face = FACES[mood - 1];
  const fillId = `niu-disc-${tone.replace('#', '')}`; // one gradient for each colour: the same id would show the first one everywhere
  return (
    <svg viewBox="-2 -4 52 54" width={size} height={size} className={className} aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 2.5px rgb(8 20 50 / 0.3))', overflow: 'visible' }}>
      <defs>
        <radialGradient id={fillId} cx="35%" cy="25%" r="90%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor={tone} />
          <stop offset="1" stopColor={tone} />
        </radialGradient>
      </defs>
      <Shapes pass="edge" fillId={fillId} />
      <Shapes pass="fill" fillId={fillId} />
      {ring && <circle cx="24" cy="26.5" r="21.5" fill="none" stroke="var(--dz-text)" strokeWidth="1.6" opacity="0.55" />}
      {/* patches, eyes, nose, mouth: drawn for a bigger head, so scaled down to this one */}
      <g transform="translate(24 30.5) scale(0.9) translate(-24 -29)">
        <ellipse cx="15.6" cy="28.6" rx="5.4" ry="6.6" fill={FUR} transform="rotate(-22 15.6 28.6)" />
        <ellipse cx="32.4" cy="28.6" rx="5.4" ry="6.6" fill={FUR} transform="rotate(22 32.4 28.6)" />
        <Eye x={15.8} kind={face.eyes} />
        <Eye x={32.2} kind={face.eyes} />
        <path d="M21.4 33.4 q2.6 -2.2 5.2 0 q-.5 2.5 -2.6 3 q-2.1 -.5 -2.6 -3z" fill={FUR} />
        {face.mouth}
      </g>
      {EXTRAS[mood - 1]}
    </svg>
  );
}
