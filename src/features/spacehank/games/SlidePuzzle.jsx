import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { isSolvedSlide, newSlide, slideTile } from './grid';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { seconds, useBest } from './shared';

const SIZE = 4;

/** Ghép số (the 15 puzzle): slide the tiles, one or a whole row at a time, until 1 to 15 are in order. */
export default function SlidePuzzle() {
  const [board, setBoard] = useState(() => newSlide(SIZE));
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(0);
  const [time, setTime] = useState(0);
  const [best, report] = useBest('slide', true);
  const [record, setRecord] = useState(false);
  const done = moves > 0 && isSolvedSlide(board);

  useEffect(() => {
    if (!started || done) return undefined;
    const tick = window.setInterval(() => setTime(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(tick);
  }, [started, done]);

  const tap = (i) => {
    if (done) return;
    const next = slideTile(board, i, SIZE);
    if (!next) {
      navigator.vibrate?.(15);
      return;
    }
    if (!started) setStarted(Date.now());
    setBoard(next);
    setMoves((m) => m + 1);
    if (isSolvedSlide(next)) {
      setTime(Math.floor((Date.now() - (started || Date.now())) / 1000));
      setRecord(report(moves + 1));
    }
  };
  const again = () => {
    setBoard(newSlide(SIZE));
    setMoves(0);
    setStarted(0);
    setTime(0);
    setRecord(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label="nước đi" value={moves} tone={RED} />
        <Score label="thời gian" value={seconds(time)} />
        <Score label="ít nhất" value={best ?? '-'} />
      </div>
      <InkBox className="p-2" fill="#fdfaf0">
        <ul className="grid grid-cols-4 gap-2" aria-label="Sliding puzzle">
          {board.map((value, i) => (
            <li key={value || 'blank'} className="aspect-square" style={{ order: i }}>
              {value ? (
                <InkBox as="button" type="button" onClick={() => tap(i)} aria-label={`Tile ${value}`} className="size-full transition-transform active:scale-95" innerClassName="grid size-full place-items-center" tone={value % 2 ? INK : RED} fill="#fffdf3" round={6}>
                  <b className="font-pen text-[2.1rem] leading-none font-bold" style={{ color: value % 2 ? INK : RED }}>
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
      <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">Chạm một ô cạnh chỗ trống. Chạm ô xa hơn trong cùng hàng để đẩy cả hàng.</p>
      <div className="flex">
        <InkButton className="ml-auto" tone={RED} onClick={again}>
          <RotateCcw size={15} aria-hidden="true" /> Xáo lại
        </InkButton>
      </div>
      {done && (
        <Note title="Xếp xong rồi!" detail={`${moves} nước đi trong ${seconds(time)}${record ? ' · kỷ lục mới!' : ''}`}>
          <InkButton onClick={again}>Chơi lại</InkButton>
        </Note>
      )}
    </div>
  );
}
