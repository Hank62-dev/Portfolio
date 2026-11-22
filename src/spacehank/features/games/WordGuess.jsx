import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { getLang, tr } from '../../core/i18n/lang';
import { INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { MISSES_ALLOWED, missCount, shownWord, wordState } from './more';
import { useBest } from './shared';

// words to guess, with what kind of thing they are; Vietnamese ones written without their marks
const VI = [
  ['PHO BO', 'Món ăn'], ['BANH MI', 'Món ăn'], ['BUN CHA', 'Món ăn'], ['GOI CUON', 'Món ăn'], ['CA PHE SUA', 'Đồ uống'], ['TRA DA', 'Đồ uống'],
  ['AO DAI', 'Trang phục'], ['NON LA', 'Trang phục'], ['HOA SEN', 'Loài hoa'], ['HOA MAI', 'Loài hoa'], ['HA LONG', 'Địa danh'], ['DA LAT', 'Địa danh'],
  ['HOI AN', 'Địa danh'], ['SAI GON', 'Địa danh'], ['TET', 'Ngày lễ'], ['TRUNG THU', 'Ngày lễ'], ['CON MEO', 'Con vật'], ['CON VOI', 'Con vật'],
  ['XE MAY', 'Phương tiện'], ['MAY BAY', 'Phương tiện'], ['BAN PHIM', 'Đồ dùng'], ['DIEN THOAI', 'Đồ dùng'], ['LAP TRINH', 'Công việc'], ['CO SO DU LIEU', 'Công việc'],
];
const EN = [
  ['KEYBOARD', 'Object'], ['UMBRELLA', 'Object'], ['LANTERN', 'Object'], ['PINEAPPLE', 'Fruit'], ['MANGO', 'Fruit'], ['COCONUT', 'Fruit'],
  ['ELEPHANT', 'Animal'], ['DOLPHIN', 'Animal'], ['PENGUIN', 'Animal'], ['VOLCANO', 'Nature'], ['RAINBOW', 'Nature'], ['THUNDER', 'Nature'],
  ['JAVASCRIPT', 'Code'], ['DATABASE', 'Code'], ['FUNCTION', 'Code'], ['COMPILER', 'Code'], ['GUITAR', 'Music'], ['PIANO', 'Music'],
  ['BICYCLE', 'Transport'], ['SUBMARINE', 'Transport'], ['PASSPORT', 'Travel'], ['SUITCASE', 'Travel'], ['LIBRARY', 'Place'], ['MUSEUM', 'Place'],
];
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** A flower drawn in pen that loses a petal for every wrong letter. */
const Flower = ({ petals }) => (
  <svg viewBox="0 0 120 120" className="mx-auto h-32 w-32" aria-hidden="true">
    <g filter="url(#pen)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
      <path d="M60 64c0 22 2 36 0 50M60 96c-10-8-20-8-26-2 8 6 18 6 26 2M60 88c8-7 18-8 24-3-7 6-17 7-24 3" stroke="#2f7a46" fill="#cfe9cf" />
      {Array.from({ length: MISSES_ALLOWED }, (_, i) => {
        const a = (i / MISSES_ALLOWED) * Math.PI * 2 - Math.PI / 2;
        const x = 60 + Math.cos(a) * 22;
        const y = 44 + Math.sin(a) * 22;
        return i < petals ? <ellipse key={i} cx={x} cy={y} rx="11" ry="7" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} fill="#ffd0d8" stroke={RED} /> : null;
      })}
      <circle cx="60" cy="44" r="10" fill="#ffd35e" stroke="#c98a00" />
    </g>
  </svg>
);

const newWord = (list, last) => {
  let w;
  do w = list[Math.floor(Math.random() * list.length)];
  while (list.length > 1 && w[0] === last);
  return w;
};

/** Đoán chữ (word guess): find the word a letter at a time. Each wrong letter takes a petal off the flower; seven and it is bare. */
export default function WordGuess() {
  const list = useMemo(() => (getLang() === 'vi' ? VI : EN), []);
  const [[word, kind], setWord] = useState(() => newWord(list));
  const [guesses, setGuesses] = useState(() => new Set());
  const [streak, setStreak] = useState(0);
  const [best, report] = useBest('words');
  const state = wordState(word, guesses);
  const misses = missCount(word, guesses);

  const guess = (ch) => {
    if (state !== 'playing' || guesses.has(ch)) return;
    const next = new Set(guesses).add(ch);
    setGuesses(next);
    const after = wordState(word, next);
    if (after === 'won') {
      setStreak((s) => {
        report(s + 1);
        return s + 1;
      });
    } else if (after === 'lost') setStreak(0);
  };
  const again = () => {
    setWord(newWord(list, word));
    setGuesses(new Set());
  };

  // typing on a keyboard works too
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch)) guess(ch);
      else if (e.key === 'Enter' && state !== 'playing') again();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Score label={tr('petals left')} value={MISSES_ALLOWED - misses} tone={RED} />
        <Score label={tr('in a row')} value={streak} />
        <Score label={tr('best run')} value={best ?? '-'} />
      </div>
      <Flower petals={MISSES_ALLOWED - misses} />
      <p className="text-center font-hand text-[1rem] text-[#20296a]/75">{tr('Hint: {0}', kind)}</p>
      <p className="text-center font-pen text-[2.3rem] leading-none font-bold tracking-[0.18em] break-all" style={{ color: INK }} aria-live="polite">
        {state === 'lost' ? word : shownWord(word, guesses)}
      </p>
      <InkBox className="p-2" fill="#fdfaf0">
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={tr('Letters')}>
          {KEYS.map((ch) => {
            const used = guesses.has(ch);
            const good = used && word.includes(ch);
            return (
              <button key={ch} type="button" disabled={used || state !== 'playing'} onClick={() => guess(ch)} className="aspect-square rounded-sm font-pen text-[1.35rem] font-bold transition-transform active:scale-90 disabled:opacity-100" style={{ color: used ? (good ? INK : RED) : INK, opacity: used && !good ? 0.35 : 1, textDecoration: used && !good ? 'line-through' : 'none', background: good ? '#e3e8ff' : 'transparent' }}>
                {ch}
              </button>
            );
          })}
        </div>
      </InkBox>
      {state !== 'playing' && (
        <Note title={state === 'won' ? tr('Got it!') : tr('The flower is bare')} detail={state === 'won' ? tr('{0} wrong letters', misses) : tr('The word was {0}', word)}>
          <InkButton onClick={again}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('Next word')}
          </InkButton>
        </Note>
      )}
    </div>
  );
}
