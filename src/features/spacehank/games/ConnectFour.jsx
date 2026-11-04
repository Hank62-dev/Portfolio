import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { C4_COLS, C4_ROWS, c4Full, c4Move, c4Winner, dropDisc, emptyC4, landingRow } from './boards';
import { INK, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';

const CELL = 40;

/** Bốn quân: drop discs into the columns and be first to get four in a row. You are blue, the phone is red. */
export default function ConnectFour() {
  const [board, setBoard] = useState(emptyC4);
  const [last, setLast] = useState(-1);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState(null); // { who, line } | { who: 3 } for a draw
  const [score, setScore] = useState({ you: 0, phone: 0 });
  const [best, report] = useBest('connect4');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const settle = (next) => {
    const win = c4Winner(next);
    if (win) {
      setResult(win);
      const updated = win.who === 1 ? { ...score, you: score.you + 1 } : { ...score, phone: score.phone + 1 };
      setScore(updated);
      if (win.who === 1) report(updated.you);
      return true;
    }
    if (c4Full(next)) {
      setResult({ who: 3 });
      return true;
    }
    return false;
  };

  const play = (col) => {
    if (thinking || result) return;
    const mine = dropDisc(board, col, 1);
    if (!mine) return;
    setBoard(mine);
    setLast(landingRow(board, col) * C4_COLS + col);
    if (settle(mine)) return;
    setThinking(true);
    timer.current = window.setTimeout(() => {
      const reply = c4Move(mine, 2, 5);
      const theirs = dropDisc(mine, reply, 2);
      setBoard(theirs);
      setLast(landingRow(mine, reply) * C4_COLS + reply);
      setThinking(false);
      settle(theirs);
    }, 420);
  };

  const again = () => {
    window.clearTimeout(timer.current);
    setBoard(emptyC4());
    setLast(-1);
    setThinking(false);
    setResult(null);
  };

  const width = C4_COLS * CELL;
  const height = C4_ROWS * CELL;
  const centre = (i) => [(i % C4_COLS) * CELL + CELL / 2, Math.floor(i / C4_COLS) * CELL + CELL / 2];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label="bạn (xanh)" value={score.you} />
        <Score label="máy (đỏ)" value={score.phone} tone={RED} />
        <Score label="kỷ lục" value={best ?? '-'} />
      </div>
      <svg viewBox={`-6 -6 ${width + 12} ${height + 12}`} className="block w-full touch-manipulation rounded-sm bg-[#fdfaf0]" role="grid" aria-label="Four in a row board">
        <g stroke={INK} strokeWidth="1" opacity="0.3">
          {Array.from({ length: C4_COLS + 1 }, (_, k) => (
            <path key={`v${k}`} d={`M${k * CELL} 0V${height}`} />
          ))}
          {Array.from({ length: C4_ROWS + 1 }, (_, k) => (
            <path key={`h${k}`} d={`M0 ${k * CELL}H${width}`} />
          ))}
        </g>
        <g filter="url(#pen)" strokeWidth="2.6" strokeLinecap="round">
          {board.map((who, i) => {
            if (!who) return <circle key={i} cx={centre(i)[0]} cy={centre(i)[1]} r="2" fill={INK} opacity="0.25" />;
            const [x, y] = centre(i);
            const tone = who === 1 ? INK : RED;
            return (
              <circle key={i} cx={x} cy={y} r="15" fill={who === 1 ? 'rgb(44 58 168 / 0.22)' : 'rgb(207 59 51 / 0.22)'} stroke={tone}>
                {i === last && <animate attributeName="cy" from={-CELL} to={y} dur="0.3s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.6 1" keyTimes="0;1" />}
              </circle>
            );
          })}
        </g>
        {result?.line && (
          <path d={`M${centre(result.line[0])[0]} ${centre(result.line[0])[1]}L${centre(result.line[3])[0]} ${centre(result.line[3])[1]}`} stroke="#e6b800" strokeWidth="9" strokeLinecap="round" opacity="0.6" />
        )}
        {Array.from({ length: C4_COLS }, (_, col) => (
          <rect
            key={col}
            x={col * CELL}
            y="0"
            width={CELL}
            height={height}
            fill="transparent"
            className={result || thinking || landingRow(board, col) < 0 ? '' : 'cursor-pointer'}
            role="gridcell"
            aria-label={`Drop in column ${col + 1}`}
            tabIndex={0}
            onClick={() => play(col)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && play(col)}
          />
        ))}
      </svg>
      <p className="h-7 text-center font-pen text-[1.4rem] leading-none font-semibold" style={{ color: INK }} role="status">
        {thinking ? 'Máy đang nghĩ…' : result ? '' : 'Đến lượt bạn: chạm một cột'}
      </p>
      <div className="flex">
        <InkButton className="ml-auto" tone={RED} onClick={again}>
          <RotateCcw size={15} aria-hidden="true" /> Ván mới
        </InkButton>
      </div>
      {result && (
        <Note title={result.who === 1 ? 'Bạn thắng!' : result.who === 2 ? 'Máy thắng…' : 'Hòa nhau'} detail={result.who === 1 ? 'Bốn quân liền nhau.' : result.who === 2 ? 'Máy chặn khéo thật. Thử lại nhé.' : 'Kín bàn mà không ai đủ bốn.'}>
          <InkButton onClick={again}>Chơi lại</InkButton>
        </Note>
      )}
    </div>
  );
}
