import { useRef, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { CARO, caroMove, caroWin } from './logic';
import { INK, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';

const blank = () => Array(CARO * CARO).fill(0);
const CELL = 28;

/** Cờ caro, as it is played in the back row of a classroom: X and O on squared paper, five in a row wins. */
export default function Caro() {
  const [board, setBoard] = useState(blank);
  const [moves, setMoves] = useState([]);
  const [line, setLine] = useState(null);
  const [winner, setWinner] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [wins, setWins] = useState(0);
  const [best, report] = useBest('caro');
  const timer = useRef(0);

  const finish = (next, index, who) => {
    const found = caroWin(next, Math.floor(index / CARO), index % CARO);
    if (found) {
      setLine(found);
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
  const side = CARO * CELL;
  const last = moves[moves.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label="bạn (X)" value={wins} />
        <Score label="máy (O)" value={winner === 2 ? 1 : 0} tone={RED} />
        <Score label="kỷ lục" value={best ?? '-'} />
      </div>
      <svg viewBox={`-4 -4 ${side + 8} ${side + 8}`} className="block w-full touch-manipulation rounded-sm bg-[#fdfaf0]" role="grid" aria-label="Caro board">
        <g stroke={INK} strokeWidth="1" opacity="0.38">
          {Array.from({ length: CARO + 1 }, (_, k) => (
            <path key={k} d={`M${k * CELL} 0V${side}M0 ${k * CELL}H${side}`} />
          ))}
        </g>
        <g filter="url(#pen)" fill="none" strokeLinecap="round" strokeWidth="2.8">
          {board.map((who, i) => {
            const x = (i % CARO) * CELL + CELL / 2;
            const y = Math.floor(i / CARO) * CELL + CELL / 2;
            if (who === 1) return <path key={i} d={`M${x - 7} ${y - 7}L${x + 7} ${y + 7}M${x + 7} ${y - 7}L${x - 7} ${y + 7}`} stroke={INK} />;
            if (who === 2) return <circle key={i} cx={x} cy={y} r="8" stroke={RED} />;
            return null;
          })}
          {line && (
            <path d={`M${line[0][1] * CELL + CELL / 2} ${line[0][0] * CELL + CELL / 2}L${line[line.length - 1][1] * CELL + CELL / 2} ${line[line.length - 1][0] * CELL + CELL / 2}`} stroke="#e6b800" strokeWidth="9" opacity="0.55" />
          )}
        </g>
        {last !== undefined && <rect x={(last % CARO) * CELL + 2} y={Math.floor(last / CARO) * CELL + 2} width={CELL - 4} height={CELL - 4} fill="none" stroke="#e6b800" strokeWidth="1.6" strokeDasharray="3 3" />}
        {board.map((who, i) =>
          who || winner ? null : (
            <rect key={i} x={(i % CARO) * CELL} y={Math.floor(i / CARO) * CELL} width={CELL} height={CELL} fill="transparent" className="cursor-pointer" role="gridcell" aria-label={`Row ${Math.floor(i / CARO) + 1}, column ${(i % CARO) + 1}`} tabIndex={0} onClick={() => play(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && play(i)} />
          )
        )}
      </svg>
      <p className="h-7 text-center font-pen text-[1.4rem] leading-none font-semibold" style={{ color: INK }} role="status">
        {thinking ? 'Máy đang nghĩ…' : winner ? '' : 'Đến lượt bạn (X)'}
      </p>
      <div className="flex gap-2">
        <InkButton onClick={undo} disabled={moves.length < 2 || thinking || Boolean(winner)}>
          <Undo2 size={15} aria-hidden="true" /> Đi lại
        </InkButton>
        <InkButton className="ml-auto" tone={RED} onClick={again}>
          <RotateCcw size={15} aria-hidden="true" /> Ván mới
        </InkButton>
      </div>
      {winner > 0 && (
        <Note title={winner === 1 ? 'Bạn thắng!' : winner === 2 ? 'Máy thắng…' : 'Hòa nhau'} detail={winner === 1 ? 'Năm quân liền nhau.' : 'Thử lại nhé.'}>
          <InkButton onClick={again}>Chơi lại</InkButton>
        </Note>
      )}
    </div>
  );
}
