import { tr } from '../../core/i18n/lang';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { addTile, canMove2048, move2048, new2048 } from './grid';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

// the paper of each tile warms up as the number grows, and the big ones are written in red
const PAPER = { 2: '#fffdf3', 4: '#fff3c4', 8: '#ffe2b3', 16: '#ffcfa6', 32: '#ffb9a3', 64: '#ffa196', 128: '#d8e1ff', 256: '#bccaff', 512: '#a1b4ff', 1024: '#8aa0ff', 2048: '#ffd35e' };

const fresh = () => ({ board: new2048(), score: 0, over: false });

/** Gộp số (2048): slide the whole page one way, equal numbers join. Swipe, or use the arrow keys. */
export default function Game2048() {
  const [game, setGame] = useState(fresh);
  const [before, setBefore] = useState(null); // the move before, for "Đi lại"
  const [reached, setReached] = useState(false); // 2048 made, and the note shown
  const [best, report] = useBest('2048');
  const touch = useRef(null);

  const latest = useRef(game); // the newest game, so two quick swipes never act on an old board
  const slide = useCallback((dir) => {
    const g = latest.current;
    if (g.over) return;
    const moved = move2048(g.board, dir);
    if (!moved.moved) return;
    const board = addTile(moved.board);
    const next = { board, score: g.score + moved.gained, over: !canMove2048(board) };
    latest.current = next;
    setBefore(g);
    setGame(next);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      slide(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slide]);

  useEffect(() => {
    if (game.score) report(game.score);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the record is only worth keeping when the score changes
  }, [game.score]);

  const top = Math.max(...game.board);
  const again = () => {
    const next = fresh();
    latest.current = next;
    setGame(next);
    setBefore(null);
    setReached(false);
  };
  const undo = () => {
    if (!before) return;
    latest.current = before;
    setGame(before);
    setBefore(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('điểm')} value={game.score} tone={RED} />
        <Score label={tr('ô lớn nhất')} value={top} />
        <Score label={tr('kỷ lục')} value={best ?? '-'} />
      </div>
      <div
        className="touch-none select-none"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const from = touch.current;
          touch.current = null;
          if (!from) return;
          const dx = e.changedTouches[0].clientX - from.x;
          const dy = e.changedTouches[0].clientY - from.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          slide(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }}
      >
        <InkBox className="p-2" fill="#fdfaf0">
          <ul className="grid grid-cols-4 gap-2" aria-label={tr('2048 board')}>
            {game.board.map((value, i) => (
              <li key={i} className="aspect-square">
                {value ? (
                  <InkBox className="size-full animate-[pop_0.25s_ease-out]" innerClassName="grid size-full place-items-center" tone={value >= 128 ? RED : INK} fill={PAPER[value] ?? '#ffd35e'} round={6}>
                    <b className={`font-pen leading-none font-bold ${value >= 1000 ? 'text-[1.5rem]' : value >= 100 ? 'text-[1.9rem]' : 'text-[2.3rem]'}`} style={{ color: value >= 128 ? RED : INK }}>
                      {value}
                    </b>
                  </InkBox>
                ) : (
                  <i className="block size-full rounded-md bg-[#2c3aa8]/[0.07]" />
                )}
              </li>
            ))}
          </ul>
        </InkBox>
      </div>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Vuốt trên bảng, hoặc dùng phím mũi tên.')}</p>
      <div className="flex gap-2">
        <InkButton onClick={undo} disabled={!before || game.over}>
          <Undo2 size={15} aria-hidden="true" /> {tr('Đi lại')}
        </InkButton>
        <InkButton className="ml-auto" tone={RED} onClick={again}>
          <RotateCcw size={15} aria-hidden="true" /> {tr('Ván mới')}
        </InkButton>
      </div>
      {game.over && (
        <Note title={tr('Hết nước đi!')} detail={tr('{0} điểm, ô lớn nhất là {1}.', game.score, top)}>
          <InkButton onClick={again}>{tr('Chơi lại')}</InkButton>
        </Note>
      )}
      {!game.over && top >= 2048 && !reached && (
        <Note title={tr('Chạm 2048!')} detail={tr('Giỏi quá. Chơi tiếp cho cao hơn nhé.')}>
          <InkButton onClick={() => setReached(true)}>{tr('Chơi tiếp')}</InkButton>
        </Note>
      )}
    </div>
  );
}
