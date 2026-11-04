import { useState } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { LIGHTS, allOff, newLights, pressLamp, pressesForLevel } from './grid';
import { INK, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';

const make = (level) => {
  const start = newLights(pressesForLevel(level));
  return { start, board: start };
};

/** Tắt đèn (lights out): pressing a lamp flips it and the four beside it. Switch them all off, then try a harder page. */
export default function LightsOut() {
  const [level, setLevel] = useState(1);
  const [state, setState] = useState(() => make(1));
  const [moves, setMoves] = useState(0);
  const [best, report] = useBest('lights');
  const solved = allOff(state.board);

  const press = (i) => {
    if (solved) return;
    const board = pressLamp(state.board, i);
    setState((s) => ({ ...s, board }));
    setMoves((m) => m + 1);
    if (allOff(board)) report(level);
  };
  const go = (next) => {
    setLevel(next);
    setState(make(next));
    setMoves(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label="màn" value={level} tone={RED} />
        <Score label="lần bấm" value={moves} />
        <Score label="màn cao nhất" value={best ?? '-'} />
      </div>
      <div className="mx-auto grid w-full max-w-[22rem] grid-cols-5 gap-2.5 rounded-sm bg-[#fdfaf0] p-3" role="grid" aria-label="Lamps">
        {state.board.map((on, i) => (
          <button key={i} type="button" role="gridcell" aria-pressed={Boolean(on)} aria-label={`Lamp ${Math.floor(i / LIGHTS) + 1}, ${(i % LIGHTS) + 1}, ${on ? 'on' : 'off'}`} onClick={() => press(i)} className="aspect-square transition-transform active:scale-90">
            <svg viewBox="0 0 48 48" className="size-full" aria-hidden="true">
              <g filter="url(#pen)" strokeLinecap="round" strokeLinejoin="round">
                {on ? (
                  <>
                    <circle cx="24" cy="24" r="18" fill="#ffd35e" stroke="#c98a00" strokeWidth="2.6" />
                    <path d="M24 3v5M24 40v5M3 24h5M40 24h5M9 9l4 4M35 35l4 4M39 9l-4 4M9 39l4-4" stroke="#c98a00" strokeWidth="2.2" />
                  </>
                ) : (
                  <circle cx="24" cy="24" r="16" fill="#e9ecff" stroke={INK} strokeWidth="2.2" opacity="0.7" />
                )}
              </g>
            </svg>
          </button>
        ))}
      </div>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">Bấm một đèn: nó và bốn đèn kề bên đổi sáng tối.</p>
      <div className="flex gap-2">
        <InkButton onClick={() => { setState((s) => ({ ...s, board: s.start })); setMoves(0); }}>
          <RotateCcw size={15} aria-hidden="true" /> Làm lại màn
        </InkButton>
        <InkButton className="ml-auto" tone={RED} onClick={() => go(level)}>
          <Shuffle size={15} aria-hidden="true" /> Màn khác
        </InkButton>
      </div>
      {solved && (
        <Note title="Tắt hết rồi!" detail={`Màn ${level} xong sau ${moves} lần bấm.`}>
          <InkButton onClick={() => go(level + 1)}>Màn {level + 1}</InkButton>
        </Note>
      )}
    </div>
  );
}
