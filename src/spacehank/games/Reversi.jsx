import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { R_SIZE, countDiscs, legalMoves, newReversi, playReversi, reversiMove, whoNext } from './boards';
import { INK, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';
import { tr } from '../lang';

const CELL = 36;

/** Cờ lật (reversi): trap the other side's discs between yours and they turn over. Most discs at the end wins. You are blue. */
export default function Reversi() {
  const [board, setBoard] = useState(newReversi);
  const [turn, setTurn] = useState(1); // 1 you, 2 the phone, 0 the game is over
  const [last, setLast] = useState(-1);
  const [passed, setPassed] = useState('');
  const [best, report] = useBest('reversi');
  const [record, setRecord] = useState(false);

  const mine = useMemo(() => (turn === 1 ? legalMoves(board, 1) : []), [board, turn]);
  const count = countDiscs(board);

  // the phone's turn: a short pause, then it plays (and plays again if you have to pass)
  useEffect(() => {
    if (turn !== 2) return undefined;
    const timer = window.setTimeout(() => {
      const move = reversiMove(board, 2);
      const next = playReversi(board, move, 2);
      setBoard(next);
      setLast(move);
      const after = whoNext(next, 2);
      setPassed(after === 2 ? tr('Bạn hết nước đi, máy đi tiếp.') : '');
      setTurn(after);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [turn, board]);

  useEffect(() => {
    if (turn === 0 && count[1] > count[2]) setRecord(report(count[1] - count[2]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the game ends
  }, [turn]);

  const play = (i) => {
    if (turn !== 1) return;
    const next = playReversi(board, i, 1);
    if (!next) return;
    setBoard(next);
    setLast(i);
    const after = whoNext(next, 1);
    setPassed(after === 1 ? tr('Máy hết nước đi, bạn đi tiếp.') : '');
    setTurn(after);
  };
  const again = () => {
    setBoard(newReversi());
    setTurn(1);
    setLast(-1);
    setPassed('');
    setRecord(false);
  };

  const side = R_SIZE * CELL;
  const centre = (i) => [(i % R_SIZE) * CELL + CELL / 2, Math.floor(i / R_SIZE) * CELL + CELL / 2];
  const playable = new Set(mine.map((m) => m.i));
  const won = count[1] > count[2] ? 1 : count[1] < count[2] ? 2 : 3;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('bạn (xanh)')} value={count[1]} />
        <Score label={tr('máy (đỏ)')} value={count[2]} tone={RED} />
        <Score label={tr('hơn nhiều nhất')} value={best ?? '-'} />
      </div>
      <svg viewBox={`-4 -4 ${side + 8} ${side + 8}`} className="block w-full touch-manipulation rounded-sm bg-[#fdfaf0]" role="grid" aria-label={tr('Reversi board')}>
        <g stroke={INK} strokeWidth="1" opacity="0.35">
          {Array.from({ length: R_SIZE + 1 }, (_, k) => (
            <path key={k} d={`M${k * CELL} 0V${side}M0 ${k * CELL}H${side}`} />
          ))}
        </g>
        <g filter="url(#pen)" strokeWidth="2.6" strokeLinecap="round">
          {board.map((who, i) => {
            if (!who) return null;
            const [x, y] = centre(i);
            return <circle key={i} cx={x} cy={y} r="13.5" fill={who === 1 ? 'rgb(44 58 168 / 0.28)' : 'rgb(207 59 51 / 0.24)'} stroke={who === 1 ? INK : RED} />;
          })}
        </g>
        {last >= 0 && <rect x={(last % R_SIZE) * CELL + 2} y={Math.floor(last / R_SIZE) * CELL + 2} width={CELL - 4} height={CELL - 4} fill="none" stroke="#e6b800" strokeWidth="1.6" strokeDasharray="3 3" />}
        {[...playable].map((i) => {
          const [x, y] = centre(i);
          return <circle key={`m${i}`} cx={x} cy={y} r="4" fill={INK} opacity="0.4" />;
        })}
        {board.map((who, i) =>
          who || !playable.has(i) ? null : (
            <rect key={i} x={(i % R_SIZE) * CELL} y={Math.floor(i / R_SIZE) * CELL} width={CELL} height={CELL} fill="transparent" className="cursor-pointer" role="gridcell" aria-label={tr('Row {0}, column {1}', Math.floor(i / R_SIZE) + 1, (i % R_SIZE) + 1)} tabIndex={0} onClick={() => play(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && play(i)} />
          )
        )}
      </svg>
      <p className="min-h-7 text-center font-pen text-[1.4rem] leading-none font-semibold" style={{ color: INK }} role="status">
        {turn === 2 ? tr('Máy đang nghĩ…') : turn === 1 ? passed || tr('Đến lượt bạn: chạm chấm nhỏ') : ''}
      </p>
      <div className="flex">
        <InkButton className="ml-auto" tone={RED} onClick={again}>
          <RotateCcw size={15} aria-hidden="true" /> {tr('Ván mới')}
        </InkButton>
      </div>
      {turn === 0 && (
        <Note title={won === 1 ? tr('Bạn thắng!') : won === 2 ? tr('Máy thắng…') : tr('Hòa nhau')} detail={tr('{0} quân xanh, {1} quân đỏ{2}', count[1], count[2], record ? tr(' · kỷ lục mới!') : '')}>
          <InkButton onClick={again}>{tr('Chơi lại')}</InkButton>
        </Note>
      )}
    </div>
  );
}
