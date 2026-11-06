import { useEffect, useMemo, useState } from 'react';
import { Eraser, Lightbulb, RotateCcw } from 'lucide-react';
import { clashes, makeSudoku } from './logic';
import { INK, InkBox, InkButton, Note, PENCIL, RED, Score } from './ink';
import { seconds, useBest } from './shared';
import { tr } from '../lang';

const LEVELS = [
  { id: 'easy', label: tr('Dễ'), blanks: 34 },
  { id: 'medium', label: tr('Vừa'), blanks: 44 },
  { id: 'hard', label: tr('Khó'), blanks: 52 },
];
const CELL = 40;

/** Sudoku on squared paper: printed digits in pencil, yours in blue pen, clashes in red, the chosen square in highlighter. */
export default function Sudoku() {
  const [level, setLevel] = useState('easy');
  const [game, setGame] = useState(null);
  const [grid, setGrid] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [started, setStarted] = useState(0);
  const [time, setTime] = useState(0);
  const [hints, setHints] = useState(0);
  const [best, report] = useBest(`sudoku-${level}`, true);
  const [record, setRecord] = useState(false);

  const deal = (id = level) => {
    setGame(null);
    window.setTimeout(() => {
      const made = makeSudoku(LEVELS.find((l) => l.id === id).blanks);
      setGame(made);
      setGrid([...made.puzzle]);
      setChosen(null);
      setStarted(Date.now());
      setTime(0);
      setHints(0);
      setRecord(false);
    }, 30);
  };
  useEffect(() => {
    deal(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new puzzle when the level changes
  }, [level]);

  const bad = useMemo(() => clashes(grid), [grid]);
  const solved = game && grid.every((d, i) => d === game.solution[i]);

  useEffect(() => {
    if (!game || solved) return undefined;
    const timer = window.setInterval(() => setTime(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [game, solved, started]);
  useEffect(() => {
    if (solved) setRecord(report(time));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report once, when the grid is complete
  }, [solved]);

  const put = (digit) => {
    if (chosen === null || !game || game.puzzle[chosen]) return;
    setGrid((g) => g.map((d, i) => (i === chosen ? digit : d)));
  };
  const hint = () => {
    if (chosen === null || !game || game.puzzle[chosen]) return;
    setGrid((g) => g.map((d, i) => (i === chosen ? game.solution[i] : d)));
    setHints((n) => n + 1);
  };
  const same = chosen !== null && grid[chosen] ? grid[chosen] : 0;
  const side = CELL * 9;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5" role="radiogroup" aria-label={tr('Level')}>
        {LEVELS.map((l) => (
          <InkButton key={l.id} role="radio" aria-checked={level === l.id} solid={level === l.id} onClick={() => setLevel(l.id)} className="flex-1" tone={level === l.id ? RED : INK}>
            {l.label}
          </InkButton>
        ))}
      </div>
      <div className="flex gap-2">
        <Score label={tr('thời gian')} value={seconds(time)} />
        <Score label={tr('gợi ý')} value={hints} tone={RED} />
        <Score label={tr('kỷ lục')} value={best === null ? '-' : seconds(best)} />
      </div>

      {!game ? (
        <p className="grid aspect-square place-items-center font-pen text-[1.6rem]" style={{ color: INK }} role="status">
          {tr('Đang kẻ đề…')}
        </p>
      ) : (
        <svg viewBox={`-4 -4 ${side + 8} ${side + 8}`} className="block w-full" role="grid" aria-label={tr('Sudoku board')}>
          {chosen !== null &&
            Array.from({ length: 81 }, (_, i) => {
              const inLine = Math.floor(i / 9) === Math.floor(chosen / 9) || i % 9 === chosen % 9;
              const alike = same && grid[i] === same;
              if (i !== chosen && !inLine && !alike) return null;
              return <rect key={i} x={(i % 9) * CELL} y={Math.floor(i / 9) * CELL} width={CELL} height={CELL} fill={i === chosen ? '#ffe27a' : alike ? '#ffe9a0' : '#fff3c2'} opacity={i === chosen ? 0.9 : 0.55} />;
            })}
          <g stroke={PENCIL} strokeWidth="1" opacity="0.6">
            {Array.from({ length: 10 }, (_, k) => (
              <path key={k} d={`M${k * CELL} 0V${side}M0 ${k * CELL}H${side}`} />
            ))}
          </g>
          <g filter="url(#pen)" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none">
            {[0, 3, 6, 9].map((k) => (
              <path key={k} d={`M${k * CELL} 0V${side}M0 ${k * CELL}H${side}`} />
            ))}
          </g>
          {grid.map((digit, i) => {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const given = Boolean(game.puzzle[i]);
            return (
              <g key={i}>
                {digit ? (
                  <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 9} textAnchor="middle" fontSize="28" fontWeight="700" className="font-pen" fill={bad.has(i) ? RED : given ? PENCIL : INK}>
                    {digit}
                  </text>
                ) : null}
                <rect x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="transparent" role="gridcell" aria-label={tr('Row {0}, column {1}{2}', r + 1, c + 1, digit ? `, ${digit}` : tr(', empty'))} tabIndex={0} className="cursor-pointer" onClick={() => setChosen(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChosen(i)} />
              </g>
            );
          })}
        </svg>
      )}

      <div className="grid grid-cols-9 gap-1.5" role="group" aria-label={tr('Digits')}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <InkBox key={d} as="button" type="button" onClick={() => put(d)} className="aspect-[3/4] transition-transform active:scale-90">
            <span className="grid aspect-[3/4] place-items-center font-pen text-[1.7rem] font-bold" style={{ color: INK }}>
              {d}
            </span>
          </InkBox>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <InkButton onClick={() => put(0)}>
          <Eraser size={15} aria-hidden="true" /> {tr('Tẩy')}
        </InkButton>
        <InkButton onClick={hint}>
          <Lightbulb size={15} aria-hidden="true" /> {tr('Gợi ý')}
        </InkButton>
        <InkButton className="ml-auto" tone={RED} onClick={() => deal()}>
          <RotateCcw size={15} aria-hidden="true" /> {tr('Đề mới')}
        </InkButton>
      </div>
      {solved && (
        <Note title={record ? tr('Kỷ lục mới!') : tr('Giải xong rồi!')} detail={tr('{0} · {1} gợi ý', seconds(time), hints)}>
          <InkButton onClick={() => deal()}>{tr('Đề khác')}</InkButton>
        </Note>
      )}
    </div>
  );
}
