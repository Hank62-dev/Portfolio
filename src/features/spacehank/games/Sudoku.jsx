import { useEffect, useMemo, useState } from 'react';
import { Eraser, Lightbulb, RotateCcw } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { clashes, makeSudoku } from './logic';
import { Result, Stat, seconds, useBest } from './shared';

const LEVELS = [
  { id: 'easy', label: 'Easy', blanks: 34 },
  { id: 'medium', label: 'Medium', blanks: 44 },
  { id: 'hard', label: 'Hard', blanks: 52 },
];

/** Sudoku: a puzzle with one answer. Tap a cell, then a digit; clashes turn red; a hint fills the chosen cell. */
export default function Sudoku() {
  const [level, setLevel] = useState('easy');
  const [game, setGame] = useState(null); // { puzzle, solution }
  const [grid, setGrid] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [started, setStarted] = useState(0);
  const [time, setTime] = useState(0);
  const [hints, setHints] = useState(0);
  const [best, report] = useBest(`sudoku-${level}`, true);
  const [record, setRecord] = useState(false);

  const deal = (id = level) => {
    setGame(null);
    // the puzzle takes a moment to make: let the screen say so first
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5" role="radiogroup" aria-label="Level">
        {LEVELS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={level === l.id} onClick={() => setLevel(l.id)} className={clsx('flex-1 rounded-full py-2 font-mono text-[0.78rem] transition-colors', level === l.id ? 'bg-signal text-ink-0' : 'bg-white/8 text-bone-dim')}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Stat label="Time" value={seconds(time)} />
        <Stat label="Hints" value={hints} />
        <Stat label="Best" value={best === null ? '-' : seconds(best)} />
      </div>

      {!game ? (
        <p className="grid aspect-square place-items-center rounded-3xl border border-line bg-ink-1 font-mono text-fine text-bone-dim" role="status">
          Making a puzzle…
        </p>
      ) : (
        <div className="grid aspect-square grid-cols-9 overflow-hidden rounded-2xl border-2 border-line-strong bg-ink-1" role="grid" aria-label="Sudoku board">
          {grid.map((digit, i) => {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const given = Boolean(game.puzzle[i]);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={`Row ${r + 1}, column ${c + 1}${digit ? `, ${digit}` : ', empty'}`}
                onClick={() => setChosen(i)}
                className={clsx(
                  'grid place-items-center border-line font-display text-[1.25rem] transition-colors',
                  c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-line-strong' : 'border-r',
                  r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-line-strong' : 'border-b',
                  chosen === i ? 'bg-signal/30' : chosen !== null && (Math.floor(chosen / 9) === r || chosen % 9 === c) ? 'bg-white/5' : same && digit === same ? 'bg-signal/15' : '',
                  bad.has(i) ? 'text-danger' : given ? 'text-bone' : 'text-signal'
                )}
              >
                {digit || ''}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-9 gap-1.5" role="group" aria-label="Digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} type="button" onClick={() => put(d)} className="grid aspect-[3/4] place-items-center rounded-xl border border-line bg-ink-2 font-display text-[1.3rem] text-bone active:scale-90">
            {d}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => put(0)}>
          <Eraser size={14} aria-hidden="true" /> Erase
        </Button>
        <Button variant="ghost" size="sm" onClick={hint}>
          <Lightbulb size={14} aria-hidden="true" /> Hint
        </Button>
        <Button variant="ghost" size="sm" onClick={() => deal()} className="ml-auto">
          <RotateCcw size={14} aria-hidden="true" /> New
        </Button>
      </div>
      {solved && (
        <Result title={record ? 'A new record' : 'Solved'} detail={`${seconds(time)} · ${hints} hints`}>
          <Button size="sm" onClick={() => deal()}>
            Another puzzle
          </Button>
        </Result>
      )}
    </div>
  );
}
