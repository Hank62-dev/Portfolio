import { useMemo, useState } from 'react';
import { Eraser, PenLine, Shuffle, X } from 'lucide-react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { lineClue, makePicture, pictureClues, pictureSolved } from './more';
import { useBest, seconds } from './shared';

const SIZES = [5, 7, 10];

const make = (size) => {
  const picture = makePicture(size);
  return { size, clues: pictureClues(picture, size), cells: Array(size * size).fill(0), started: Date.now() };
};

/**
 * Tô ô (picture logic): the numbers by each row and column are the runs of filled squares in it, in order. Fill the squares
 * so every row and column matches; mark the ones you are sure stay empty with a cross.
 */
export default function PictureLogic() {
  const [size, setSize] = useState(5);
  // a board per size, so each keeps its own best time
  return <Puzzle key={size} start={size} onSize={setSize} />;
}

function Puzzle({ start, onSize }) {
  const [game, setGame] = useState(() => make(start));
  const [mode, setMode] = useState('fill'); // fill | cross
  const [doneIn, setDoneIn] = useState(null);
  const [best, report] = useBest(`picross-${game.size}`, true);
  const { size, clues, cells } = game;
  const solved = doneIn !== null;

  // which lines already match their clue, for the numbers to grey out
  const matched = useMemo(() => {
    const fill = cells.map((c) => (c === 1 ? 1 : 0));
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    return {
      rows: clues.rows.map((clue, r) => same(lineClue(fill.slice(r * size, r * size + size)), clue)),
      cols: clues.cols.map((clue, c) => same(lineClue(Array.from({ length: size }, (_, r) => fill[r * size + c])), clue)),
    };
  }, [cells, clues, size]);

  const tap = (i) => {
    if (solved) return;
    const next = [...cells];
    const want = mode === 'fill' ? 1 : 2;
    next[i] = next[i] === want ? 0 : want;
    setGame((g) => ({ ...g, cells: next }));
    if (pictureSolved(next, clues, size)) {
      const took = Math.round((Date.now() - game.started) / 1000);
      setDoneIn(took);
      report(took);
    }
  };

  const fresh = () => {
    setGame(make(size));
    setDoneIn(null);
  };

  const cell = size === 10 ? 'min(7.4vw, 1.75rem)' : size === 7 ? 'min(9vw, 2.4rem)' : 'min(12vw, 3.1rem)';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('squares')} value={`${size}×${size}`} tone={RED} />
        <Score label={tr('best time')} value={best === null ? '-' : seconds(best)} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SIZES.map((n) => (
          <InkButton key={n} tone={n === size ? RED : INK} solid={n === size} onClick={() => (n === size ? fresh() : onSize(n))} className="w-14">
            {n}
          </InkButton>
        ))}
        <InkButton tone={mode === 'fill' ? RED : INK} onClick={() => setMode('fill')} aria-pressed={mode === 'fill'}>
          <PenLine size={15} aria-hidden="true" /> {tr('Fill')}
        </InkButton>
        <InkButton tone={mode === 'cross' ? RED : INK} onClick={() => setMode('cross')} aria-pressed={mode === 'cross'}>
          <X size={15} aria-hidden="true" /> {tr('Cross')}
        </InkButton>
      </div>
      <InkBox className="overflow-x-auto p-2" fill="#fdfaf0">
        <table className="mx-auto border-collapse" style={{ '--cell': cell }}>
          <thead>
            <tr>
              <th />
              {clues.cols.map((clue, c) => (
                <th key={c} className="px-0 pb-1 align-bottom font-pen text-[0.95rem] leading-[1.05] font-bold" style={{ color: matched.cols[c] ? '#20296a55' : INK }}>
                  {clue.map((n, k) => (
                    <div key={k}>{n}</div>
                  ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clues.rows.map((clue, r) => (
              <tr key={r}>
                <th className="pr-1.5 text-right font-pen text-[0.95rem] font-bold whitespace-nowrap" style={{ color: matched.rows[r] ? '#20296a55' : INK }}>
                  {clue.join(' ')}
                </th>
                {Array.from({ length: size }, (_, c) => {
                  const i = r * size + c;
                  const v = cells[i];
                  return (
                    <td key={c} className="p-0">
                      <button
                        type="button"
                        onClick={() => tap(i)}
                        aria-label={tr('Square {0}, {1}', r + 1, c + 1)}
                        aria-pressed={v === 1}
                        className="block touch-manipulation"
                        style={{
                          width: 'var(--cell)',
                          height: 'var(--cell)',
                          background: v === 1 ? INK : '#fffdf3',
                          border: `1px solid ${INK}55`,
                          borderRightWidth: (c + 1) % 5 === 0 && c + 1 < size ? 2 : 1,
                          borderBottomWidth: (r + 1) % 5 === 0 && r + 1 < size ? 2 : 1,
                          color: RED,
                        }}
                      >
                        {v === 2 && <X size="70%" strokeWidth={2.4} aria-hidden="true" className="mx-auto" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </InkBox>
      <div className="flex gap-2">
        <InkButton onClick={() => setGame((g) => ({ ...g, cells: Array(size * size).fill(0) }))} disabled={solved}>
          <Eraser size={15} aria-hidden="true" /> {tr('Clear')}
        </InkButton>
        <InkButton className="ml-auto" tone={RED} onClick={() => fresh()}>
          <Shuffle size={15} aria-hidden="true" /> {tr('New picture')}
        </InkButton>
      </div>
      {solved && (
        <Note title={tr('Picture done!')} detail={tr('Solved in {0}', seconds(doneIn))}>
          <InkButton onClick={() => fresh()}>{tr('Another')}</InkButton>
        </Note>
      )}
    </div>
  );
}
