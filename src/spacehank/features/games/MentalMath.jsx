import { useEffect, useRef, useState } from 'react';
import { Delete, Play } from 'lucide-react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { mathQuestion } from './more';
import { useBest } from './shared';

const ROUND = 60;
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

/** Tính nhẩm (mental math): as many sums as you can in a minute. They get harder as you go; a right answer moves on by itself. */
export default function MentalMath() {
  const [phase, setPhase] = useState('ready');
  const [question, setQuestion] = useState(() => mathQuestion(0));
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [left, setLeft] = useState(ROUND);
  const [shake, setShake] = useState(false);
  const [best, report] = useBest('math');
  const end = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        setPhase('done');
        report(scoreRef.current);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock runs once per round
  }, [phase]);

  const start = () => {
    end.current = Date.now() + ROUND * 1000;
    scoreRef.current = 0;
    setScore(0);
    setWrong(0);
    setAnswer('');
    setLeft(ROUND);
    setQuestion(mathQuestion(0));
    setPhase('running');
  };

  const type = (key) => {
    if (phase !== 'running') return;
    if (key === 'del') return setAnswer((a) => a.slice(0, -1));
    if (key === 'ok') {
      if (!answer) return;
      if (Number(answer) !== question.answer) {
        setWrong((w) => w + 1);
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setAnswer('');
      }
      return;
    }
    const next = (answer + key).slice(0, 4);
    setAnswer(next);
    if (Number(next) === question.answer) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setQuestion(mathQuestion(scoreRef.current));
      setAnswer('');
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('del');
      else if (e.key === 'Enter') type('ok');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('right')} value={score} tone={RED} />
        <Score label={tr('seconds')} value={left} />
        <Score label={tr('best')} value={best ?? '-'} />
      </div>
      <InkBox className={`p-4 text-center transition-transform ${shake ? 'translate-x-1' : ''}`} fill="#fdfaf0" tone={shake ? RED : INK}>
        <p className="font-pen text-[2.8rem] leading-none font-bold" style={{ color: INK }}>
          {phase === 'ready' ? '? + ?' : question.text} =
        </p>
        <p className="mt-2 min-h-[2.6rem] font-pen text-[2.4rem] leading-none" style={{ color: RED }} aria-live="polite">
          {answer || ' '}
        </p>
      </InkBox>
      {phase === 'ready' ? (
        <>
          <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('One minute. Type the answer: a right one moves on by itself.')}</p>
          <InkButton solid className="mx-auto" onClick={start}>
            <Play size={15} aria-hidden="true" /> {tr('Start')}
          </InkButton>
        </>
      ) : (
        <div className="mx-auto grid w-full max-w-[18rem] grid-cols-3 gap-2" role="group" aria-label={tr('Number pad')}>
          {PAD.map((k) => (
            <InkButton key={k} onClick={() => type(k)} disabled={phase !== 'running'} tone={k === 'ok' ? RED : INK} aria-label={k === 'del' ? tr('Delete') : k === 'ok' ? tr('Check') : k}>
              {k === 'del' ? <Delete size={18} aria-hidden="true" /> : k === 'ok' ? '✓' : k}
            </InkButton>
          ))}
        </div>
      )}
      {phase === 'done' && (
        <Note title={tr('{0} right in a minute', score)} detail={tr('{0} wrong tries', wrong)}>
          <InkButton onClick={start}>{tr('Play again')}</InkButton>
        </Note>
      )}
    </div>
  );
}
