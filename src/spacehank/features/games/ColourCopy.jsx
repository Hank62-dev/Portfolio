import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { tr } from '../../core/i18n/lang';
import { InkButton, Note, RED, Score } from './ink';
import { extendSequence } from './more';
import { useBest } from './shared';

const PADS = [
  { fill: '#7f8cff', lit: '#c9ceff', stroke: '#2c3aa8', note: 330, name: 'Blue' },
  { fill: '#ff7f78', lit: '#ffcfcb', stroke: '#cf3b33', note: 392, name: 'Red' },
  { fill: '#ffd35e', lit: '#fff0b8', stroke: '#c98a00', note: 494, name: 'Yellow' },
  { fill: '#7fd39a', lit: '#cff3da', stroke: '#2f7a46', note: 587, name: 'Green' },
];

let audio;
/** A short soft tone for a pad (once the page has been touched, so the browser lets it play). */
const beep = (freq) => {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.32);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.35);
  } catch {
    /* no sound, the light is enough */
  }
};

/** Nhớ màu (copy the colours): four pads light up in a row; press them back in the same order. One more each round. */
export default function ColourCopy() {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0); // how far into the sequence the player has pressed
  const [lit, setLit] = useState(-1);
  const [phase, setPhase] = useState('idle'); // idle | showing | yours | over
  const [best, report] = useBest('simon');
  const timers = useRef([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const flash = (pad, ms = 380) => {
    setLit(pad);
    beep(PADS[pad].note);
    timers.current.push(setTimeout(() => setLit(-1), ms));
  };

  const show = (seq) => {
    clear();
    setPhase('showing');
    setStep(0);
    const gap = Math.max(260, 620 - seq.length * 25);
    seq.forEach((pad, i) => timers.current.push(setTimeout(() => flash(pad, gap * 0.65), 500 + i * gap)));
    timers.current.push(setTimeout(() => setPhase('yours'), 500 + seq.length * gap));
  };

  const start = () => {
    const first = extendSequence([]);
    setSequence(first);
    show(first);
  };

  const press = (pad) => {
    if (phase !== 'yours') return;
    flash(pad, 200);
    if (pad !== sequence[step]) {
      navigator.vibrate?.(60);
      setPhase('over');
      report(sequence.length - 1);
      return;
    }
    if (step + 1 === sequence.length) {
      const next = extendSequence(sequence);
      setSequence(next);
      timers.current.push(setTimeout(() => show(next), 500));
      setPhase('showing');
    } else setStep(step + 1);
  };

  const round = phase === 'over' ? sequence.length - 1 : Math.max(0, sequence.length - (phase === 'yours' || phase === 'showing' ? 1 : 0));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('remembered')} value={round} tone={RED} />
        <Score label={tr('best')} value={best ?? '-'} />
      </div>
      <p className="text-center font-pen text-[1.5rem] leading-none" style={{ color: phase === 'yours' ? RED : '#20296a' }} aria-live="polite">
        {phase === 'showing' ? tr('Watch…') : phase === 'yours' ? tr('Your turn: {0} of {1}', step + 1, sequence.length) : ' '}
      </p>
      <div className="mx-auto grid w-full max-w-[20rem] grid-cols-2 gap-3">
        {PADS.map((p, i) => (
          <button key={p.name} type="button" aria-label={tr(p.name)} onPointerDown={() => press(i)} className="aspect-square touch-manipulation transition-transform active:scale-95" disabled={phase !== 'yours'}>
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
              <g filter="url(#pen)">
                <rect x="6" y="6" width="88" height="88" rx="12" fill={lit === i ? p.lit : p.fill} stroke={p.stroke} strokeWidth="3" style={{ transition: 'fill 120ms' }} />
                {lit === i && <rect x="14" y="14" width="72" height="72" rx="8" fill="none" stroke="#fff" strokeWidth="3" opacity="0.8" />}
              </g>
            </svg>
          </button>
        ))}
      </div>
      {phase === 'idle' && (
        <>
          <p className="text-center font-hand text-[0.95rem] text-[#20296a]/70">{tr('Watch the pads light up, then press them in the same order. Each round adds one.')}</p>
          <InkButton solid className="mx-auto" onClick={start}>
            <Play size={15} aria-hidden="true" /> {tr('Start')}
          </InkButton>
        </>
      )}
      {phase === 'over' && (
        <Note title={tr('Wrong pad!')} detail={tr('You remembered {0} in a row', sequence.length - 1)}>
          <InkButton onClick={start}>{tr('Play again')}</InkButton>
        </Note>
      )}
    </div>
  );
}
