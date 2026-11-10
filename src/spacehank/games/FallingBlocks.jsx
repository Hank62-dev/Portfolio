import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { T_COLS, T_ROWS, cellsOf, fall, hardDrop, landing, newTetris, shift, speedOf, spawn, turn, upNext } from './tetris';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';
import { tr } from '../lang';

const CELL = 24;
// each kind of block gets its own pen colour
const PEN = ['', '#2c3aa8', '#b8860b', '#5b2c91', '#1f7a3a', '#cf3b33', '#1f7a7a', '#d2691e'];

/** Xếp hình (falling blocks): turn and slide the pieces, fill a whole line and it disappears. */
export default function FallingBlocks() {
  const [game, setGame] = useState(() => newTetris());
  const [running, setRunning] = useState(false);
  const [best, report] = useBest('tetris');
  const latest = useRef(game);
  latest.current = game;

  const act = useCallback((fn) => setGame((g) => (g.over ? g : fn(g))), []);
  const left = useCallback(() => act((g) => shift(g, -1)), [act]);
  const right = useCallback(() => act((g) => shift(g, 1)), [act]);
  const down = useCallback(() => act((g) => fall(g)), [act]);
  const rotate = useCallback(() => act(turn), [act]);
  const drop = useCallback(() => act((g) => hardDrop(g)), [act]);

  useEffect(() => {
    if (!running || game.over) return undefined;
    const timer = window.setInterval(() => setGame((g) => (g.over ? g : fall(g))), speedOf(game.level));
    return () => window.clearInterval(timer);
  }, [running, game.over, game.level]);

  useEffect(() => {
    if (game.over) {
      setRunning(false);
      if (game.score) report(game.score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report once, when the game ends
  }, [game.over]);

  useEffect(() => {
    const keys = { ArrowLeft: left, ArrowRight: right, ArrowDown: down, ArrowUp: rotate, ' ': drop, a: left, d: right, s: down, w: rotate };
    const onKey = (e) => {
      if (e.key === 'p' || e.key === 'P') return setRunning((r) => !r);
      const fn = keys[e.key];
      if (!fn) return undefined;
      e.preventDefault();
      setRunning(true);
      return fn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [left, right, down, rotate, drop]);

  const again = () => {
    setGame(newTetris());
    setRunning(true);
  };

  const ghost = landing(game);
  const next = spawn(upNext(game));
  const live = new Set(cellsOf(game.piece).map(([r, c]) => `${r},${c}`));

  const block = (kind, x, y, key, dashed = false) => (
    <rect key={key} x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} rx="4" fill={dashed ? 'none' : `${PEN[kind]}33`} stroke={PEN[kind]} strokeWidth={dashed ? 1.4 : 2.2} strokeDasharray={dashed ? '3 3' : undefined} opacity={dashed ? 0.55 : 1} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('điểm')} value={game.score} tone={RED} />
        <Score label={tr('dòng')} value={game.lines} />
        <Score label={tr('màn')} value={game.level} />
        <Score label={tr('kỷ lục')} value={best ?? '-'} />
      </div>
      <div className="flex items-start gap-3">
        <svg viewBox={`-3 -3 ${T_COLS * CELL + 6} ${T_ROWS * CELL + 6}`} className="block min-w-0 flex-1 touch-none rounded-sm bg-[#fdfaf0]" role="img" aria-label={tr('Falling blocks, score {0}', game.score)}>
          <g stroke={INK} strokeWidth="1" opacity="0.18">
            {Array.from({ length: T_COLS + 1 }, (_, k) => (
              <path key={`v${k}`} d={`M${k * CELL} 0V${T_ROWS * CELL}`} />
            ))}
            {Array.from({ length: T_ROWS + 1 }, (_, k) => (
              <path key={`h${k}`} d={`M0 ${k * CELL}H${T_COLS * CELL}`} />
            ))}
          </g>
          <g filter="url(#pen)">
            {game.board.map((kind, i) => (kind ? block(kind, (i % T_COLS) * CELL, Math.floor(i / T_COLS) * CELL, i) : null))}
            {!game.over && cellsOf(ghost).map(([r, c]) => (live.has(`${r},${c}`) || r < 0 ? null : block(game.piece.kind, c * CELL, r * CELL, `g${r},${c}`, true)))}
            {cellsOf(game.piece).map(([r, c]) => (r < 0 ? null : block(game.piece.kind, c * CELL, r * CELL, `p${r},${c}`)))}
          </g>
        </svg>
        <div className="flex w-[5.2rem] shrink-0 flex-col gap-3">
          <InkBox className="p-2 text-center" fill="#fdfaf0">
            <small className="font-hand text-[0.78rem] text-[#20296a]/70">{tr('tiếp theo')}</small>
            <svg viewBox="0 0 96 72" className="mt-1 block w-full" aria-hidden="true">
              <g filter="url(#pen)" transform={`translate(${48 - (next.shape[0].length * 18) / 2} ${36 - (next.shape.filter((row) => row.some(Boolean)).length * 18) / 2 - next.shape.findIndex((row) => row.some(Boolean)) * 18})`}>
                {next.shape.flatMap((row, r) => row.map((on, c) => (on ? <rect key={`${r}${c}`} x={c * 18 + 1.5} y={r * 18 + 1.5} width="15" height="15" rx="3" fill={`${PEN[next.kind]}33`} stroke={PEN[next.kind]} strokeWidth="2" /> : null)))}
              </g>
            </svg>
          </InkBox>
          <InkButton onClick={() => setRunning((r) => !r)} disabled={game.over} aria-label={running ? tr('Pause') : tr('Play')} className="w-full">
            {running ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          </InkButton>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        <Hold onTick={left} label={tr('Left')} icon={ArrowLeft} />
        <Hold onTick={rotate} label={tr('Rotate')} icon={RotateCw} once />
        <Hold onTick={right} label={tr('Right')} icon={ArrowRight} />
        <Hold onTick={down} label={tr('Down')} icon={ArrowDown} />
        <Hold onTick={drop} label={tr('Drop')} icon={ChevronsDown} once />
      </div>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Giữ nút ◀ ▶ ▼ để lặp. Bàn phím: mũi tên, cách để thả nhanh, P để tạm dừng.')}</p>
      {game.over && (
        <Note title={tr('Đầy bảng rồi!')} detail={tr('{0} điểm, {1} dòng.', game.score, game.lines)}>
          <InkButton onClick={again}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('Chơi lại')}
          </InkButton>
        </Note>
      )}
    </div>
  );
}

/** A pad that repeats while it is held (the first press does it once, then after a short wait it keeps going). */
function Hold({ onTick, label, icon: Icon, once = false }) {
  const timers = useRef({ wait: 0, repeat: 0 });
  const stop = () => {
    window.clearTimeout(timers.current.wait);
    window.clearInterval(timers.current.repeat);
  };
  useEffect(() => stop, []);
  return (
    <InkBox
      as="button"
      type="button"
      aria-label={label}
      className="h-14 touch-manipulation select-none transition-transform active:scale-90"
      onPointerDown={(e) => {
        e.preventDefault();
        stop();
        onTick();
        if (once) return;
        timers.current.wait = window.setTimeout(() => {
          timers.current.repeat = window.setInterval(onTick, 85);
        }, 260);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="grid h-14 place-items-center" style={{ color: INK }}>
        <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
      </span>
    </InkBox>
  );
}
