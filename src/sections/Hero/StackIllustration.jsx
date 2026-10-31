import { LAYERS } from '../../data/projects';

// A flat, isometric drawing of the same four layers as the 3D scene. It is what you get when 3D is
// off (reduced motion, data saver, weak device, no WebGL) and what shows while the scene loads.
const CX = 200;
const HALF_W = 150;
const HALF_D = 56;
const THICK = 10;
const Y0 = 92;
const STEP = 82;

const Plate = ({ y, label, index }) => (
  <g>
    <polygon
      points={`${CX - HALF_W},${y} ${CX},${y + HALF_D} ${CX},${y + HALF_D + THICK} ${CX - HALF_W},${y + THICK}`}
      fill="var(--color-ink-3)"
      stroke="var(--color-line-strong)"
    />
    <polygon
      points={`${CX},${y + HALF_D} ${CX + HALF_W},${y} ${CX + HALF_W},${y + THICK} ${CX},${y + HALF_D + THICK}`}
      fill="var(--color-ink-2)"
      stroke="var(--color-line-strong)"
    />
    <polygon
      points={`${CX},${y - HALF_D} ${CX + HALF_W},${y} ${CX},${y + HALF_D} ${CX - HALF_W},${y}`}
      fill="var(--color-ink-1)"
      stroke="var(--color-bone-faint)"
      strokeOpacity="0.6"
    />
    <circle cx={CX} cy={y} r="4.5" fill="var(--color-signal)" />
    <text
      x={CX + HALF_W + 14}
      y={y + 4}
      textAnchor="start"
      fontFamily="var(--font-mono)"
      fontSize="10"
      letterSpacing="1.2"
      fill="var(--color-bone-dim)"
    >
      <tspan fill="var(--color-signal)">{String(index + 1).padStart(2, '0')} </tspan>
      {label.toUpperCase()}
    </text>
  </g>
);

export default function StackIllustration({ labels }) {
  return (
    <svg viewBox="0 0 520 440" className="h-full max-h-[520px] w-full" role="presentation" focusable="false">
      <line x1={CX} y1="18" x2={CX} y2="424" stroke="var(--color-signal)" strokeWidth="1.5" />
      {LAYERS.map((layer, i) => (
        <Plate key={layer} y={Y0 + i * STEP} label={labels[layer]} index={i} />
      ))}
    </svg>
  );
}
