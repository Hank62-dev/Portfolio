import { SIZE } from './battleship';
import { INK, RED } from './ink';

// The sea-battle board, drawn in pen: ten by ten squares, paper boats seen from above, blots of ink where a boat was hit.
// Shared by the game against the computer (SeaBattle.jsx) and the one against a friend over the network (OnlineBattle.jsx).

export const C = 30; // a square, in the board's own drawing units
export const LETTERS = 'ABCDEFGHIJ';

/** A paper boat seen from above, drawn along its squares. `tone` is the colour of the pen it is drawn with. */
function Boat({ ship, tone }) {
  const [first, last] = [ship.cells[0], ship.cells[ship.cells.length - 1]];
  const r0 = Math.floor(first / SIZE);
  const c0 = first % SIZE;
  const r1 = Math.floor(last / SIZE);
  const c1 = last % SIZE;
  const cx = ((c0 + c1 + 1) / 2 + 1) * C;
  const cy = ((r0 + r1 + 1) / 2 + 1) * C;
  const w = ship.size * C - 8;
  const h = C - 10;
  const vertical = ship.cells.length > 1 && c0 === c1;
  const bow = Math.min(h / 2 + 2, w / 2);
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${vertical ? 90 : 0})`} stroke={tone} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d={`M ${-w / 2} ${-h / 2} L ${w / 2 - bow} ${-h / 2} Q ${w / 2} 0 ${w / 2 - bow} ${h / 2} L ${-w / 2} ${h / 2} Z`} fill="#fdfaf0" />
      <path d={`M ${-w / 2 + 3} ${-h / 2 + 3.5} L ${w / 2 - bow - 2} ${-h / 2 + 3.5} M ${-w / 2 + 3} ${h / 2 - 3.5} L ${w / 2 - bow - 2} ${h / 2 - 3.5}`} strokeWidth="1" opacity="0.55" />
      {ship.size > 1 && <rect x={-w / 2 + 6} y={-h / 4} width={Math.min(14, w / 3)} height={h / 2} rx="2" fill="none" strokeWidth="1.4" />}
      {ship.size > 2 && <path d={`M ${w / 6} 0 L ${w / 6 + 8} 0`} strokeWidth="1.4" />}
      {ship.size === 1 && <circle r="3" fill="none" strokeWidth="1.4" />}
    </g>
  );
}

/** A splash of ink where a boat was hit: a scribbled blot with a cross over it. */
const Blot = ({ cx, cy, seed }) => (
  <g transform={`translate(${cx} ${cy})`} filter="url(#pen)">
    {[0, 1, 2, 3].map((k) => {
      const a = (seed * 7 + k * 2.1) % 6.28;
      return <circle key={k} cx={Math.cos(a) * 3.2} cy={Math.sin(a) * 3.2} r={5.5 - k} fill={INK} opacity="0.42" />;
    })}
    <path d="M-6.5 -6.5L6.5 6.5M6.5 -6.5L-6.5 6.5" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </g>
);

/**
 * One ten by ten board. `reveal` shows the boats (your own fleet); otherwise only boats that have sunk show, in red.
 * `onShoot` makes the squares tappable.
 */
export function Board({ fleet, shots, reveal = false, onShoot, label }) {
  const side = (SIZE + 1) * C;
  return (
    <svg viewBox={`0 0 ${side} ${side}`} className="block w-full" role="group" aria-label={label}>
      <defs>
        <pattern id="hatch-bs" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1" opacity="0.4" />
        </pattern>
      </defs>
      {[...LETTERS].map((l, r) => (
        <text key={l} x={C * 0.5} y={(r + 1.5) * C + 6} textAnchor="middle" className="font-pen" fontSize="19" fontWeight="700" fill={INK}>
          {l}
        </text>
      ))}
      {Array.from({ length: SIZE }, (_, c) => (
        <text key={c} x={(c + 1.5) * C} y={C * 0.72} textAnchor="middle" className="font-pen" fontSize="19" fontWeight="700" fill={INK}>
          {c + 1}
        </text>
      ))}
      <rect x={C} y={C} width={SIZE * C} height={SIZE * C} fill="#fdfaf0" />
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        return (r + c) % 2 === 0 ? <rect key={i} x={(c + 1) * C} y={(r + 1) * C} width={C} height={C} fill="url(#hatch-bs)" /> : null;
      })}
      <g filter="url(#pen)" fill="none" stroke={INK} strokeLinecap="round">
        <rect x={C} y={C} width={SIZE * C} height={SIZE * C} strokeWidth="2.4" />
        <rect x={C - 1.5} y={C + 1} width={SIZE * C + 2} height={SIZE * C - 1} strokeWidth="1" opacity="0.5" />
      </g>
      <g filter="url(#pen)">
        {fleet.map((ship) => {
          const sunk = ship.cells.every((cell) => shots[cell] === 3);
          if (!reveal && !sunk) return null;
          return <Boat key={ship.id} ship={ship} tone={sunk ? RED : INK} />;
        })}
      </g>
      {shots.map((s, i) => {
        const cx = ((i % SIZE) + 1.5) * C;
        const cy = (Math.floor(i / SIZE) + 1.5) * C;
        if (s === 1) return <circle key={i} cx={cx} cy={cy} r="2.6" fill={INK} opacity="0.75" />;
        if (s >= 2) return <Blot key={i} cx={cx} cy={cy} seed={i} />;
        return null;
      })}
      {onShoot &&
        shots.map((s, i) =>
          s === 0 ? (
            <rect key={i} x={((i % SIZE) + 1) * C} y={(Math.floor(i / SIZE) + 1) * C} width={C} height={C} fill="transparent" className="cursor-pointer" role="button" aria-label={`${LETTERS[Math.floor(i / SIZE)]}${(i % SIZE) + 1}`} tabIndex={0} onClick={() => onShoot(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onShoot(i)} />
          ) : null
        )}
    </svg>
  );
}
