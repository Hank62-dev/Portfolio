import { LAYERS } from '../../data/projects';

// The same four plates as the hero, drawn flat. Stack lights one up as its layer scrolls into view.
// `data-plate` / `data-top` / `data-node` are the hooks the section's GSAP code animates.
const CX = 230;
const HALF_W = 170;
const HALF_D = 64;
const THICK = 12;
const Y0 = 100;
const STEP = 108;

const Plate = ({ y, label, index }) => (
  <g data-plate={index}>
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
      strokeOpacity="0.7"
    />
    {/* the lit state: an accent wash and outline faded in over the plate */}
    <polygon
      data-glow={index}
      points={`${CX},${y - HALF_D} ${CX + HALF_W},${y} ${CX},${y + HALF_D} ${CX - HALF_W},${y}`}
      fill="var(--color-signal)"
      fillOpacity="0.2"
      stroke="var(--color-signal)"
      opacity="0"
    />
    <circle data-node={index} cx={CX} cy={y} r="5" fill="var(--color-signal)" />
    <text
      x={CX + HALF_W + 16}
      y={y + 4}
      fontFamily="var(--font-mono)"
      fontSize="11"
      letterSpacing="1.4"
      fill="var(--color-bone-dim)"
    >
      <tspan fill="var(--color-signal)">{String(index + 1).padStart(2, '0')} </tspan>
      {label.toUpperCase()}
    </text>
  </g>
);

export default function LayerDiagram({ labels }) {
  return (
    <svg viewBox="0 0 560 540" className="h-full max-h-[560px] w-full" role="presentation" focusable="false">
      <line x1={CX} y1="20" x2={CX} y2="520" stroke="var(--color-signal)" strokeWidth="1.5" />
      {LAYERS.map((layer, i) => (
        <Plate key={layer} y={Y0 + i * STEP} label={labels[layer]} index={i} />
      ))}
    </svg>
  );
}
