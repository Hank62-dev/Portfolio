import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { allLines, computerLine, drawLine } from './more';
import { useBest } from './shared';

const N = 4; // boxes a side
const CELL = 60;
const PAD = 14;
const SIZE = N * CELL + PAD * 2;

const fresh = () => ({ drawn: new Set(), owner: {}, by: {} });

/** Nối điểm (dots and boxes): take turns joining two dots; close a box to keep it and go again. You are blue, the computer red. */
export default function DotsBoxes() {
  const [game, setGame] = useState(fresh);
  const [turn, setTurn] = useState('me');
  const [wins, report] = useBest('boxes');
  const lines = allLines(N);
  const over = game.drawn.size === lines.length;
  const mine = Object.values(game.owner).filter((o) => o === 'me').length;
  const theirs = Object.values(game.owner).filter((o) => o === 'cpu').length;

  const play = (line, player) => {
    setGame((g) => {
      if (g.drawn.has(line)) return g;
      const next = drawLine(g, line, player, N);
      const after = { ...next, by: { ...g.by, [line]: player } };
      if (!next.closed) setTurn(player === 'me' ? 'cpu' : 'me');
      if (after.drawn.size === lines.length) {
        const me = Object.values(after.owner).filter((o) => o === 'me').length;
        if (me * 2 > N * N) report((wins ?? 0) + 1);
      }
      return after;
    });
  };

  // the computer thinks for a moment, then draws
  useEffect(() => {
    if (turn !== 'cpu' || over) return undefined;
    const id = setTimeout(() => play(computerLine(game, N), 'cpu'), 520);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to whose turn it is and the board
  }, [turn, game, over]);

  const restart = () => {
    setGame(fresh());
    setTurn('me');
  };

  const end = (line) => {
    const [kind, r, c] = line.split(':').map((v, i) => (i ? Number(v) : v));
    const x = PAD + c * CELL;
    const y = PAD + r * CELL;
    return kind === 'h' ? [x, y, x + CELL, y] : [x, y, x, y + CELL];
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('your boxes')} value={mine} />
        <Score label={tr('computer')} value={theirs} tone={RED} />
        <Score label={tr('games won')} value={wins ?? 0} />
      </div>
      <p className="text-center font-pen text-[1.4rem] leading-none" style={{ color: turn === 'me' ? INK : RED }} aria-live="polite">
        {over ? ' ' : turn === 'me' ? tr('Your turn: join two dots') : tr('The computer is thinking…')}
      </p>
      <InkBox className="p-2" fill="#fdfaf0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[22rem] touch-manipulation" role="group" aria-label={tr('Board')}>
          <g filter="url(#pen)">
            {Object.entries(game.owner).map(([key, who]) => {
              const [r, c] = key.split(':').map(Number);
              return (
                <g key={key}>
                  <rect x={PAD + c * CELL + 4} y={PAD + r * CELL + 4} width={CELL - 8} height={CELL - 8} fill={who === 'me' ? '#dfe3ff' : '#ffd9d6'} />
                  <text x={PAD + c * CELL + CELL / 2} y={PAD + r * CELL + CELL / 2 + 9} textAnchor="middle" className="font-pen" fontSize="28" fontWeight="700" fill={who === 'me' ? INK : RED}>
                    {who === 'me' ? 'X' : 'O'}
                  </text>
                </g>
              );
            })}
            {lines.map((line) => {
              const [x1, y1, x2, y2] = end(line);
              const who = game.by[line];
              return (
                <g key={line}>
                  {who && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={who === 'me' ? INK : RED} strokeWidth="4" strokeLinecap="round" />}
                  {!who && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={INK}
                      strokeOpacity="0"
                      strokeWidth="16"
                      strokeLinecap="round"
                      className="cursor-pointer hover:[stroke-opacity:0.18]"
                      role="button"
                      aria-label={tr('Draw a line')}
                      onClick={() => turn === 'me' && !over && play(line, 'me')}
                    />
                  )}
                </g>
              );
            })}
            {Array.from({ length: (N + 1) ** 2 }, (_, i) => (
              <circle key={i} cx={PAD + (i % (N + 1)) * CELL} cy={PAD + Math.floor(i / (N + 1)) * CELL} r="4.5" fill={INK} />
            ))}
          </g>
        </svg>
      </InkBox>
      <div className="flex">
        <InkButton className="ml-auto" onClick={restart}>
          <RotateCcw size={15} aria-hidden="true" /> {tr('New game')}
        </InkButton>
      </div>
      {over && (
        <Note title={mine > theirs ? tr('You win!') : mine < theirs ? tr('The computer wins') : tr('A draw')} detail={tr('{0} boxes to {1}', mine, theirs)}>
          <InkButton onClick={restart}>{tr('Play again')}</InkButton>
        </Note>
      )}
    </div>
  );
}
