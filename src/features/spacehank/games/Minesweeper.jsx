import { useEffect, useRef, useState } from 'react';
import { Bomb, Flag, Pickaxe, RotateCcw } from 'lucide-react';
import { flagsLeft, newMines, openCell, toggleFlag } from './grid';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { seconds, useBest } from './shared';

const NUMBER = ['', INK, '#1f7a3a', RED, '#5b2c91', '#8a2a2a', '#1f7a7a', '#222222', '#666666'];

/** Dò mìn: open the squares, flag the mines. A number says how many mines touch that square. Hold a square to flag it. */
export default function Minesweeper() {
  const [game, setGame] = useState(newMines);
  const [flagMode, setFlagMode] = useState(false);
  const [time, setTime] = useState(0);
  const [best, report] = useBest('mines', true);
  const [record, setRecord] = useState(false);
  const started = useRef(0);
  const held = useRef({ timer: 0, fired: false });

  const over = game.status === 'won' || game.status === 'lost';

  useEffect(() => {
    if (game.status !== 'playing') return undefined;
    if (!started.current) started.current = Date.now();
    const tick = window.setInterval(() => setTime(Math.floor((Date.now() - started.current) / 1000)), 250);
    return () => window.clearInterval(tick);
  }, [game.status]);

  useEffect(() => {
    if (game.status === 'won') setRecord(report(time));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the field is cleared
  }, [game.status]);

  const act = (i, asFlag) => setGame((g) => (asFlag ? toggleFlag(g, i) : openCell(g, i)));
  const again = () => {
    started.current = 0;
    setGame(newMines());
    setTime(0);
    setRecord(false);
  };

  const press = (i) => {
    held.current.fired = false;
    window.clearTimeout(held.current.timer);
    held.current.timer = window.setTimeout(() => {
      held.current.fired = true;
      navigator.vibrate?.(12);
      act(i, true);
    }, 420);
  };
  const release = () => window.clearTimeout(held.current.timer);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label="mìn còn" value={flagsLeft(game)} tone={RED} />
        <Score label="thời gian" value={seconds(time)} />
        <Score label="kỷ lục" value={best === null ? '-' : seconds(best)} />
      </div>
      <InkBox className="p-1.5" fill="#fdfaf0">
        <div className="grid select-none grid-cols-9 gap-[3px]" role="grid" aria-label="Minefield">
          {game.opened.map((open, i) => {
            const mine = game.mines?.[i];
            const flagged = game.flags[i];
            const shown = open || (game.status === 'lost' && mine);
            const count = game.counts?.[i] ?? 0;
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={shown ? (mine ? 'Mine' : `${count} mines nearby`) : flagged ? 'Flag' : 'Closed'}
                disabled={over && !shown}
                onPointerDown={() => !over && !open && press(i)}
                onPointerUp={release}
                onPointerLeave={release}
                onPointerCancel={release}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!over && !open) act(i, true);
                }}
                onClick={() => {
                  if (held.current.fired) {
                    held.current.fired = false;
                    return;
                  }
                  if (!open) act(i, flagMode);
                }}
                className={`grid aspect-square place-items-center rounded-[3px] border font-pen text-[1.25rem] leading-none font-bold transition-colors active:scale-95 ${shown ? 'border-[#2c3aa8]/20 bg-[#fffdf3]' : 'hatch border-[#2c3aa8]/55 bg-[#e9ecff]'} ${game.boom === i ? '!bg-[#ffb4ac]' : ''}`}
                style={{ color: NUMBER[count] }}
              >
                {shown ? (
                  mine ? <Bomb size={18} strokeWidth={2.2} color={game.boom === i ? RED : INK} aria-hidden="true" /> : count || ''
                ) : flagged ? (
                  <Flag size={17} strokeWidth={2.4} color={RED} fill={RED} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      </InkBox>
      <div className="flex gap-2">
        <InkButton solid={!flagMode} onClick={() => setFlagMode(false)} aria-pressed={!flagMode} className="flex-1">
          <Pickaxe size={15} aria-hidden="true" /> Mở ô
        </InkButton>
        <InkButton solid={flagMode} tone={RED} onClick={() => setFlagMode(true)} aria-pressed={flagMode} className="flex-1">
          <Flag size={15} aria-hidden="true" /> Cắm cờ
        </InkButton>
        <InkButton onClick={again} aria-label="New game">
          <RotateCcw size={15} aria-hidden="true" />
        </InkButton>
      </div>
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">Giữ một ô để cắm cờ nhanh. Lần chạm đầu luôn an toàn.</p>
      {game.status === 'won' && (
        <Note title="Dọn sạch rồi!" detail={`${seconds(time)}${record ? ' · kỷ lục mới!' : ''}`}>
          <InkButton onClick={again}>Chơi lại</InkButton>
        </Note>
      )}
      {game.status === 'lost' && (
        <Note title="Bùm!" detail="Chạm trúng mìn rồi. Thử lại nhé.">
          <InkButton onClick={again}>Chơi lại</InkButton>
        </Note>
      )}
    </div>
  );
}
