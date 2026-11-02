import { useRef, useState } from 'react';
import { Circle, RotateCcw, Undo2, X } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { CARO, caroMove, caroWin } from './logic';
import { Result, Stat, useBest } from './shared';

const blank = () => Array(CARO * CARO).fill(0);

/** Cờ caro: five in a row on a 12 by 12 board. You are X and go first; the computer is O. */
export default function Caro() {
  const [board, setBoard] = useState(blank);
  const [moves, setMoves] = useState([]); // cell indexes in the order they were played
  const [line, setLine] = useState(null);
  const [winner, setWinner] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [wins, setWins] = useState(0);
  const [best, report] = useBest('caro');
  const timer = useRef(0);

  const finish = (next, index, who) => {
    const row = Math.floor(index / CARO);
    const col = index % CARO;
    const found = caroWin(next, row, col);
    if (found) {
      setLine(new Set(found.map(([r, c]) => r * CARO + c)));
      setWinner(who);
      if (who === 1) {
        setWins((w) => w + 1);
        report(wins + 1);
      }
      return true;
    }
    if (!next.includes(0)) {
      setWinner(3);
      return true;
    }
    return false;
  };

  const play = (index) => {
    if (board[index] || winner || thinking) return;
    const mine = [...board];
    mine[index] = 1;
    setBoard(mine);
    setMoves((m) => [...m, index]);
    if (finish(mine, index, 1)) return;
    setThinking(true);
    timer.current = window.setTimeout(() => {
      const move = caroMove(mine, 2);
      const theirs = [...mine];
      theirs[move] = 2;
      setBoard(theirs);
      setMoves((m) => [...m, move]);
      setThinking(false);
      finish(theirs, move, 2);
    }, 350);
  };
  const undo = () => {
    if (thinking || winner || moves.length < 2) return;
    const next = [...board];
    next[moves[moves.length - 1]] = 0;
    next[moves[moves.length - 2]] = 0;
    setBoard(next);
    setMoves((m) => m.slice(0, -2));
  };
  const again = () => {
    window.clearTimeout(timer.current);
    setBoard(blank());
    setMoves([]);
    setLine(null);
    setWinner(0);
    setThinking(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Stat label="You" value="X" tone="text-signal" />
        <Stat label="Computer" value="O" />
        <Stat label="Wins" value={wins} />
        <Stat label="Best" value={best ?? '-'} />
      </div>
      <div className="grid aspect-square overflow-hidden rounded-2xl border border-line-strong bg-ink-1" style={{ gridTemplateColumns: `repeat(${CARO}, minmax(0, 1fr))` }} role="grid" aria-label="Caro board">
        {board.map((who, i) => (
          <button key={i} type="button" role="gridcell" aria-label={`Row ${Math.floor(i / CARO) + 1}, column ${(i % CARO) + 1}${who ? (who === 1 ? ', X' : ', O') : ''}`} onClick={() => play(i)} disabled={Boolean(who) || Boolean(winner)} className={clsx('grid place-items-center border-r border-b border-line transition-colors', line?.has(i) ? 'bg-signal/25' : moves[moves.length - 1] === i ? 'bg-white/8' : '')}>
            {who === 1 ? <X size={18} strokeWidth={2.6} className="text-signal" aria-hidden="true" /> : who === 2 ? <Circle size={15} strokeWidth={2.6} className="text-bone" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <p className="h-5 text-center font-mono text-fine text-bone-dim" role="status">
        {thinking ? 'The computer is thinking…' : winner ? '' : 'Your move'}
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={undo} disabled={moves.length < 2 || thinking || Boolean(winner)}>
          <Undo2 size={14} aria-hidden="true" /> Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={again} className="ml-auto">
          <RotateCcw size={14} aria-hidden="true" /> New game
        </Button>
      </div>
      {winner > 0 && (
        <Result title={winner === 1 ? 'You win' : winner === 2 ? 'The computer wins' : 'A draw'} detail={winner === 1 ? 'Five in a row.' : 'Try again.'}>
          <Button size="sm" onClick={again}>
            Play again
          </Button>
        </Result>
      )}
    </div>
  );
}
