import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { canMove, fewestMoves, moveDisc, startTower, towerDone } from './more';
import { useBest } from './shared';

const COLOURS = ['#ff7f78', '#ffd35e', '#7fd39a', '#7f8cff', '#c79cff', '#ffa86b', '#6fd3c9'];

/** Tháp Hà Nội (tower of Hanoi): move the whole stack to the last peg, one disc at a time, never a bigger one on a smaller. */
export default function Hanoi() {
  const [discs, setDiscs] = useState(3);
  const [pegs, setPegs] = useState(() => startTower(3));
  const [held, setHeld] = useState(null); // the peg whose top disc is picked up
  const [moves, setMoves] = useState(0);
  const [best, report] = useBest('hanoi');
  const done = towerDone(pegs, discs);

  const tapPeg = (p) => {
    if (done) return;
    if (held === null) {
      if (pegs[p].length) setHeld(p);
      return;
    }
    if (held === p) return setHeld(null);
    if (!canMove(pegs, held, p)) {
      navigator.vibrate?.(40);
      setHeld(pegs[p].length ? p : null);
      return;
    }
    const next = moveDisc(pegs, held, p);
    setPegs(next);
    setHeld(null);
    setMoves((m) => m + 1);
    if (towerDone(next, discs)) report(discs);
  };

  const restart = (n = discs) => {
    setDiscs(n);
    setPegs(startTower(n));
    setHeld(null);
    setMoves(0);
  };

  const perfect = done && moves === fewestMoves(discs);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('moves')} value={moves} tone={RED} />
        <Score label={tr('fewest')} value={fewestMoves(discs)} />
        <Score label={tr('most discs done')} value={best ?? '-'} />
      </div>
      <div className="flex items-center justify-center gap-2" role="group" aria-label={tr('Discs')}>
        {[3, 4, 5, 6, 7].map((n) => (
          <InkButton key={n} tone={n === discs ? RED : INK} solid={n === discs} onClick={() => restart(n)} className="w-12">
            {n}
          </InkButton>
        ))}
      </div>
      <InkBox className="p-3" fill="#fdfaf0">
        <div className="grid grid-cols-3 gap-2">
          {pegs.map((peg, p) => (
            <button key={p} type="button" onClick={() => tapPeg(p)} aria-label={tr('Peg {0}, {1} discs', p + 1, peg.length)} aria-pressed={held === p} className="relative flex h-56 flex-col-reverse items-center rounded-sm pb-3" style={{ background: held === p ? '#e3e8ff' : 'transparent' }}>
              <i className="absolute top-4 bottom-3 left-1/2 w-1.5 -translate-x-1/2 rounded-full" style={{ background: INK, opacity: 0.55 }} aria-hidden="true" />
              <i className="absolute right-1 bottom-2 left-1 h-1.5 rounded-full" style={{ background: INK }} aria-hidden="true" />
              {peg.map((size, k) => {
                const top = k === peg.length - 1 && held === p;
                return (
                  <span key={size} className="relative z-[1] mb-0.5 block h-5 rounded-full border-2 transition-transform" style={{ width: `${24 + (size / 7) * 72}%`, background: COLOURS[(size - 1) % COLOURS.length], borderColor: INK, transform: top ? 'translateY(-14px)' : 'none' }} />
                );
              })}
            </button>
          ))}
        </div>
      </InkBox>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Tap a peg to pick up its top disc, then tap where it goes.')}</p>
      <div className="flex">
        <InkButton className="ml-auto" onClick={() => restart()}>
          <RotateCcw size={15} aria-hidden="true" /> {tr('Start over')}
        </InkButton>
      </div>
      {done && (
        <Note title={perfect ? tr('Perfect!') : tr('Moved!')} detail={tr('{0} moves, the fewest is {1}', moves, fewestMoves(discs))}>
          {discs < 7 && <InkButton onClick={() => restart(discs + 1)}>{tr('{0} discs', discs + 1)}</InkButton>}
          <InkButton onClick={() => restart()}>{tr('Again')}</InkButton>
        </Note>
      )}
    </div>
  );
}
