import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react';
import { newSnake, stepSnake } from './logic';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';
import { tr } from '../../core/i18n/lang';

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const SIZE = 14;
const CELL = 24;

/** Rắn săn mồi: a snake drawn in one thick pen stroke. Swipe the page, press the arrows, or use the keys. */
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
  const side = SIZE * CELL;
  const centre = ([r, c]) => `${c * CELL + CELL / 2},${r * CELL + CELL / 2}`;
  const [head] = state.body;
  const [fr, fc] = state.food;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('điểm')} value={state.score} tone={RED} />
        <Score label={tr('kỷ lục')} value={best ?? '-'} />
      </div>
      <svg
        viewBox={`-4 -4 ${side + 8} ${side + 8}`}
        className="block w-full touch-none rounded-sm bg-[#fdfaf0]"
        role="img"
        aria-label={tr('Snake board, score {0}', state.score)}
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
        <g stroke={INK} strokeWidth="1" opacity="0.32">
          {Array.from({ length: SIZE + 1 }, (_, k) => (
            <path key={k} d={`M${k * CELL} 0V${side}M0 ${k * CELL}H${side}`} />
          ))}
        </g>
        <g filter="url(#pen)" strokeLinecap="round" strokeLinejoin="round">
          <circle cx={fc * CELL + CELL / 2} cy={fr * CELL + CELL / 2} r="8" fill="rgb(207 59 51 / 0.25)" stroke={RED} strokeWidth="2.4" />
          <path d={`M${fc * CELL + CELL / 2} ${fr * CELL + 5}c0-4 3-5 5-4`} fill="none" stroke="#1f7a3a" strokeWidth="2.2" />
          <polyline points={state.body.map(centre).join(' ')} fill="none" stroke={INK} strokeWidth="11" opacity="0.9" />
          <polyline points={state.body.map(centre).join(' ')} fill="none" stroke="#fdfaf0" strokeWidth="3.5" strokeDasharray="1 9" opacity="0.8" />
          <circle cx={head[1] * CELL + CELL / 2} cy={head[0] * CELL + CELL / 2} r="9" fill={INK} />
        </g>
        <circle cx={head[1] * CELL + CELL / 2 - 3} cy={head[0] * CELL + CELL / 2 - 2} r="1.8" fill="#fdfaf0" />
        <circle cx={head[1] * CELL + CELL / 2 + 3} cy={head[0] * CELL + CELL / 2 - 2} r="1.8" fill="#fdfaf0" />
      </svg>
      <div className="mx-auto grid grid-cols-3 gap-1.5">
        <span />
        <Pad dir="up" icon={ArrowUp} turn={turn} />
        <span />
        <Pad dir="left" icon={ArrowLeft} turn={turn} />
        <InkBox as="button" type="button" aria-label={running ? tr('Pause') : tr('Start')} onClick={() => setRunning((r) => !r)} className="size-14 transition-transform active:scale-90" tone={RED}>
          <span className="grid size-14 place-items-center" style={{ color: RED }}>
            {running ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
          </span>
        </InkBox>
        <Pad dir="right" icon={ArrowRight} turn={turn} />
        <span />
        <Pad dir="down" icon={ArrowDown} turn={turn} />
        <span />
      </div>
      {state.over && (
        <Note title={tr('Hết rồi!')} detail={tr('Ăn được {0} con mồi', state.score)}>
          <InkButton onClick={again}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('Chơi lại')}
          </InkButton>
        </Note>
      )}
    </div>
  );
}

function Pad({ dir, icon: Icon, turn }) {
  return (
    <InkBox as="button" type="button" aria-label={tr('Go {0}', dir)} onClick={() => turn(dir)} className="size-14 transition-transform active:scale-90">
      <span className="grid size-14 place-items-center" style={{ color: INK }}>
        <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
      </span>
    </InkBox>
  );
}
