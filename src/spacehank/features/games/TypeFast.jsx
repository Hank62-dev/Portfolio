import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { wordRun, wordsPerMinute } from './more';
import { useBest } from './shared';

const ROUND = 30; // seconds

/** Gõ nhanh (type fast): type the words as they come for 30 seconds; the clock starts with your first key. */
export default function TypeFast() {
  const [words, setWords] = useState(() => wordRun(120));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState([]); // true / false per finished word
  const [chars, setChars] = useState(0); // correct characters, spaces included
  const [left, setLeft] = useState(ROUND);
  const [phase, setPhase] = useState('ready'); // ready | running | done
  const [best, report] = useBest('typing');
  const end = useRef(0);
  const input = useRef(null);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        setPhase('done');
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  const wpm = wordsPerMinute(chars, ROUND);
  useEffect(() => {
    if (phase === 'done') report(wpm);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the round ends
  }, [phase]);

  const onChange = (e) => {
    if (phase === 'done') return;
    if (phase === 'ready') {
      end.current = Date.now() + ROUND * 1000;
      setPhase('running');
    }
    const value = e.target.value;
    if (value.endsWith(' ')) {
      const word = value.trim();
      if (!word) return setTyped('');
      const ok = word === words[index];
      setResults((r) => [...r, ok]);
      if (ok) setChars((c) => c + word.length + 1);
      setIndex((i) => i + 1);
      setTyped('');
    } else setTyped(value);
  };

  const again = () => {
    setWords(wordRun(120));
    setIndex(0);
    setTyped('');
    setResults([]);
    setChars(0);
    setLeft(ROUND);
    setPhase('ready');
    setTimeout(() => input.current?.focus(), 0);
  };

  const right = results.filter(Boolean).length;
  const accuracy = results.length ? Math.round((right / results.length) * 100) : 100;
  const from = Math.max(0, index - 3);
  const current = words[index] ?? '';
  const slip = !current.startsWith(typed);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('seconds')} value={left} tone={RED} />
        <Score label={tr('words a minute')} value={phase === 'ready' ? '-' : wordsPerMinute(chars, ROUND - left || 1)} />
        <Score label={tr('best')} value={best ?? '-'} />
      </div>
      <InkBox className="p-4" fill="#fdfaf0">
        <p className="font-pen text-[1.55rem] leading-[1.5]" aria-live="off">
          {words.slice(from, from + 14).map((w, k) => {
            const i = from + k;
            const done = i < index;
            const color = done ? (results[i] ? INK : RED) : i === index ? (slip ? RED : INK) : '#20296a';
            return (
              <span key={i} className="mr-2 inline-block" style={{ color, opacity: done ? 0.45 : i === index ? 1 : 0.65, textDecoration: done && !results[i] ? 'line-through' : 'none', borderBottom: i === index ? `2px solid ${color}` : 'none' }}>
                {w}
              </span>
            );
          })}
        </p>
      </InkBox>
      <input
        ref={input}
        value={typed}
        onChange={onChange}
        disabled={phase === 'done'}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={tr('Type the word, then a space')}
        placeholder={phase === 'ready' ? tr('Start typing…') : ''}
        className="w-full rounded-sm border-2 bg-[#fffdf3] px-3 py-2.5 font-pen text-[1.5rem] outline-none"
        style={{ borderColor: slip ? RED : INK, color: INK }}
      />
      {phase === 'done' && (
        <Note title={tr('{0} words a minute', wpm)} detail={tr('{0} words right · {1}% accurate', right, accuracy)}>
          <InkButton onClick={again}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('Play again')}
          </InkButton>
        </Note>
      )}
    </div>
  );
}
