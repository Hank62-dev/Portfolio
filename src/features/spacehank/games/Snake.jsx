import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { newSnake, stepSnake } from './logic';
import { Result, Stat, useBest } from './shared';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const SIZE = 14;

/** Rắn săn mồi: swipe on the board, press the arrows, or use the keys; eat, grow, do not hit a wall or yourself. */
export default function Snake() {
  const [state, setState] = useState(() => newSnake(SIZE));
  const [running, setRunning] = useState(false);
  const [best, report] = useBest('snake');
  const want = useRef(null);
  const touch = useRef(null);

  const turn = useCallback((dir) => {
    want.current = dir;
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running || state.over) return undefined;
    const speed = Math.max(70, 150 - state.score * 4);
    const timer = window.setInterval(() => {
      setState((s) => {
        const next = stepSnake(s, want.current);
        want.current = null;
        return next;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [running, state.over, state.score]);

  useEffect(() => {
    if (state.over) {
      setRunning(false);
      report(state.score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report once, when the game ends
  }, [state.over]);

  useEffect(() => {
    const onKey = (e) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      turn(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const again = () => {
    want.current = null;
    setState(newSnake(SIZE));
    setRunning(false);
  };
  const cells = new Map(state.body.map(([r, c], i) => [r * SIZE + c, i === 0 ? 'head' : 'body']));
  const food = state.food[0] * SIZE + state.food[1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Stat label="Score" value={state.score} tone="text-signal" />
        <Stat label="Best" value={best ?? '-'} />
      </div>
      <div
        className="grid aspect-square touch-none overflow-hidden rounded-2xl border border-line-strong bg-ink-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Snake board, score ${state.score}`}
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const from = touch.current;
          touch.current = null;
          if (!from) return;
          const dx = e.changedTouches[0].clientX - from.x;
          const dy = e.changedTouches[0].clientY - from.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
          turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const part = cells.get(i);
          return <i key={i} className={clsx('m-px block rounded-[3px]', part === 'head' ? 'bg-signal' : part === 'body' ? 'bg-signal/55' : i === food ? 'rounded-full bg-danger' : (Math.floor(i / SIZE) + (i % SIZE)) % 2 ? 'bg-white/[0.03]' : 'bg-transparent')} />;
        })}
      </div>
      <div className="mx-auto grid grid-cols-3 gap-1.5">
        <span />
        <Pad dir="up" icon={ArrowUp} turn={turn} />
        <span />
        <Pad dir="left" icon={ArrowLeft} turn={turn} />
        <button type="button" aria-label={running ? 'Pause' : 'Start'} onClick={() => setRunning((r) => !r)} className="grid size-14 place-items-center rounded-2xl border border-line bg-ink-1 text-bone-dim active:scale-90">
          {running ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <Pad dir="right" icon={ArrowRight} turn={turn} />
        <span />
        <Pad dir="down" icon={ArrowDown} turn={turn} />
        <span />
      </div>
      {state.over && (
        <Result title="Game over" detail={`${state.score} eaten`}>
          <Button size="sm" onClick={again}>
            <RotateCcw size={14} aria-hidden="true" /> Play again
          </Button>
        </Result>
      )}
    </div>
  );
}

function Pad({ dir, icon: Icon, turn }) {
  return (
    <button type="button" aria-label={`Go ${dir}`} onClick={() => turn(dir)} className="grid size-14 place-items-center rounded-2xl border border-line bg-ink-2 text-bone active:scale-90">
      <Icon size={22} aria-hidden="true" />
    </button>
  );
}
