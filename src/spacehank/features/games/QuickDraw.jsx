import { useEffect, useRef, useState } from 'react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { averageTime } from './more';
import { useBest } from './shared';

const ROUNDS = 5;

/** Phản xạ (quick draw): wait for the card to turn red, then tap as fast as you can. Five tries; tapping early is a foul. */
export default function QuickDraw() {
  const [times, setTimes] = useState([]);
  const [phase, setPhase] = useState('ready'); // ready | waiting | now | shown | done
  const [last, setLast] = useState(null);
  const [best, report] = useBest('reaction', true);
  const shownAt = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const arm = () => {
    setPhase('waiting');
    timer.current = setTimeout(() => {
      shownAt.current = performance.now();
      setPhase('now');
    }, 1200 + Math.random() * 2600);
  };

  const tap = () => {
    if (phase === 'ready' || phase === 'shown') {
      if (times.length >= ROUNDS) return;
      arm();
    } else if (phase === 'waiting') {
      clearTimeout(timer.current);
      navigator.vibrate?.(80);
      setLast(null);
      finish([...times, null]);
    } else if (phase === 'now') {
      const ms = Math.round(performance.now() - shownAt.current);
      setLast(ms);
      finish([...times, ms]);
    }
  };

  const finish = (next) => {
    setTimes(next);
    if (next.length >= ROUNDS) {
      setPhase('done');
      const avg = averageTime(next);
      if (avg !== null) report(avg);
    } else setPhase('shown');
  };

  const reset = () => {
    setTimes([]);
    setLast(null);
    setPhase('ready');
  };

  const avg = averageTime(times);
  const face = {
    ready: [tr('Tap to start'), '#fdfaf0', INK],
    waiting: [tr('Wait for red…'), '#e3e8ff', INK],
    now: [tr('NOW!'), '#ff7f78', '#fff'],
    shown: [times.at(-1) === null ? tr('Too early!') : `${last} ms`, '#fdfaf0', times.at(-1) === null ? RED : INK],
    done: [avg === null ? '—' : `${avg} ms`, '#fff8c9', RED],
  }[phase];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('try')} value={`${Math.min(times.length + (phase === 'waiting' || phase === 'now' ? 1 : 0), ROUNDS)}/${ROUNDS}`} tone={RED} />
        <Score label={tr('average ms')} value={avg ?? '-'} />
        <Score label={tr('best ms')} value={best ?? '-'} />
      </div>
      <InkBox as="button" type="button" onPointerDown={tap} fill={face[1]} tone={phase === 'now' ? RED : INK} className="h-56 w-full touch-manipulation select-none" aria-live="assertive">
        <span className="flex h-56 flex-col items-center justify-center gap-1">
          <b className="font-pen text-[2.6rem] leading-none font-bold" style={{ color: face[2] }}>
            {face[0]}
          </b>
          {phase === 'shown' && <small className="font-hand text-[0.95rem] text-[#20296a]/70">{tr('Tap for the next try')}</small>}
        </span>
      </InkBox>
      <div className="flex flex-wrap justify-center gap-2" aria-label={tr('Your times')}>
        {times.map((t, i) => (
          <span key={i} className="font-pen text-[1.2rem]" style={{ color: t === null ? RED : INK }}>
            {t === null ? tr('foul') : `${t}`}
          </span>
        ))}
      </div>
      {phase === 'done' && (
        <Note title={avg === null ? tr('All fouls!') : `${avg} ms`} detail={avg === null ? tr('Wait for the red card before you tap.') : avg < 250 ? tr('Lightning hands.') : avg < 350 ? tr('Quick.') : tr('A coffee might help.')}>
          <InkButton onClick={reset}>{tr('Play again')}</InkButton>
        </Note>
      )}
    </div>
  );
}
