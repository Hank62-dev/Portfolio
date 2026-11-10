import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { nextHole } from './grid';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';
import { tr } from '../../core/i18n/lang';

const ROUND = 30; // seconds
const TICK = 80;

/** A mole drawn in pen: a round brown head, two eyes, a pink nose. */
const Mole = ({ hit }) => (
  <svg viewBox="0 0 48 48" className="size-full" aria-hidden="true">
    <g filter="url(#pen)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
      <path d="M8 44c0-16 6-28 16-28s16 12 16 28z" fill="#c8a07a" stroke="#6b4423" />
      {hit ? (
        <path d="M16 26l5 4M21 26l-5 4M27 26l5 4M32 26l-5 4" stroke="#3a2412" fill="none" />
      ) : (
        <>
          <circle cx="18" cy="28" r="2.2" fill="#3a2412" stroke="none" />
          <circle cx="30" cy="28" r="2.2" fill="#3a2412" stroke="none" />
        </>
      )}
      <ellipse cx="24" cy="34" rx="4.2" ry="3" fill="#ff9aa8" stroke="#a8505f" />
      <path d="M12 12l-3-5M36 12l3-5" stroke="#6b4423" fill="none" opacity="0" />
    </g>
  </svg>
);

/** Đập chuột (whack-a-mole): the moles pop out of nine holes for a moment. Tap one before it ducks back. 30 seconds. */
export default function WhackMole() {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(ROUND);
  const [score, setScore] = useState(0);
  const [hole, setHole] = useState(-1);
  const [hit, setHit] = useState(-1);
  const [missed, setMissed] = useState(0);
  const [best, report] = useBest('whack');
  const [record, setRecord] = useState(false);
  const [finished, setFinished] = useState(false);
  const clock = useRef({ end: 0, until: 0, next: 0, last: -1, score: 0 });

  useEffect(() => {
    if (!running) return undefined;
    const c = clock.current;
    const tick = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((c.end - now) / 1000));
      setLeft(remaining);
      if (now >= c.end) {
        window.clearInterval(tick);
        setHole(-1);
        setRunning(false);
        setFinished(true);
        setRecord(report(c.score));
        return;
      }
      if (c.until && now >= c.until) {
        // it ducked back before you got it
        c.until = 0;
        c.next = now + 250;
        setHole(-1);
        setMissed((m) => m + 1);
      } else if (!c.until && now >= c.next) {
        const place = nextHole(c.last);
        c.last = place;
        c.until = now + Math.max(420, 900 - c.score * 14);
        setHole(place);
      }
    }, TICK);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `report` is stable enough; the round restarts only with `running`
  }, [running]);

  const start = () => {
    const now = Date.now();
    clock.current = { end: now + ROUND * 1000, until: 0, next: now + 400, last: -1, score: 0 };
    setScore(0);
    setMissed(0);
    setLeft(ROUND);
    setHole(-1);
    setHit(-1);
    setRecord(false);
    setFinished(false);
    setRunning(true);
  };

  const whack = (i) => {
    const c = clock.current;
    if (!running || i !== hole || !c.until) return;
    c.until = 0;
    c.next = Date.now() + 200;
    c.score += 1;
    navigator.vibrate?.(10);
    setScore(c.score);
    setHit(i);
    setHole(-1);
    window.setTimeout(() => setHit(-1), 260);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('điểm')} value={score} tone={RED} />
        <Score label={tr('giây')} value={left} />
        <Score label={tr('kỷ lục')} value={best ?? '-'} />
      </div>
      <InkBox className="p-3" fill="#fdfaf0">
        <ul className="grid grid-cols-3 gap-3" aria-label={tr('Holes')}>
          {Array.from({ length: 9 }, (_, i) => (
            <li key={i} className="relative aspect-square select-none">
              <button type="button" onPointerDown={() => whack(i)} aria-label={i === hole ? tr('Mole! Tap it') : tr('Hole {0}', i + 1)} className="absolute inset-0 touch-manipulation overflow-hidden rounded-md">
                <span className={`absolute inset-x-[14%] bottom-[22%] transition-transform duration-100 ease-out ${i === hole || i === hit ? 'translate-y-0' : 'translate-y-[85%]'}`} style={{ height: '62%' }}>
                  {(i === hole || i === hit) && <Mole hit={i === hit} />}
                </span>
                {/* the hole itself, in front of the mole */}
                <svg viewBox="0 0 48 24" className="absolute inset-x-0 bottom-[8%] w-full" aria-hidden="true">
                  <g filter="url(#pen)" strokeLinecap="round">
                    <ellipse cx="24" cy="14" rx="20" ry="8" fill="#3a2a1a" stroke={INK} strokeWidth="2" />
                    <path d="M4 15c4 5 14 8 20 8s16-3 20-8v9H4z" fill="#fdfaf0" stroke="none" />
                    <path d="M4 15c4 5 14 8 20 8s16-3 20-8" fill="none" stroke={INK} strokeWidth="2" />
                  </g>
                </svg>
              </button>
              {i === hit && <span className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 animate-[pop_0.3s_ease-out] font-pen text-[1.6rem] font-bold" style={{ color: RED }}>+1</span>}
            </li>
          ))}
        </ul>
      </InkBox>
      <div className="flex">
        <InkButton solid className="ml-auto" onClick={start} disabled={running}>
          {finished ? <RotateCcw size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />} {running ? tr('Đang chơi…') : finished ? tr('Chơi lại') : tr('Bắt đầu')}
        </InkButton>
      </div>
      {!running && !finished && <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Chuột thò đầu lên là chạm ngay. Càng về sau chúng càng nhanh.')}</p>}
      {finished && (
        <Note title={tr('Hết giờ!')} detail={tr('Đập được {0} con, để sổng {1}{2}', score, missed, record ? tr(' · kỷ lục mới!') : '')}>
          <InkButton onClick={start}>{tr('Chơi lại')}</InkButton>
        </Note>
      )}
    </div>
  );
}
