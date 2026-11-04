import { useEffect, useRef, useState } from 'react';
import { BookHeart, Flame, Timer } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import Pet from '../pet/Pet';
import { TAP_LINES } from '../pet/model';
import { usePet } from '../pet/usePet';

const MOOD_WORDS = { calm: 'đang thong thả', happy: 'đang vui', excited: 'đang rất phấn khích', sleepy: 'đang buồn ngủ', worried: 'đang hơi lo', lonely: 'đang nhớ bạn' };

const Heart = ({ x, delay }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" className="pet-heart pointer-events-none absolute top-3" style={{ left: x, animationDelay: `${delay}ms` }} aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.2 5c2 0 3.6 1.1 5.8 3.2C14.2 6.1 15.8 5 17.8 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" fill="#ff7a8a" />
  </svg>
);

/** Mơ on the home screen: how she is, what she says, how far she has grown, and a way into the diary. Tap her. */
export default function PetCard({ onTab }) {
  const pet = usePet();
  const [poke, setPoke] = useState({ at: 0, line: '' });
  const timer = useRef(0);
  const hopping = poke.at > 0;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const touch = () => {
    window.clearTimeout(timer.current);
    setPoke({ at: Date.now(), line: TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)] });
    navigator.vibrate?.(8);
    timer.current = window.setTimeout(() => setPoke({ at: 0, line: '' }), 2600);
  };

  const line = poke.line || pet.line;
  const progress = Math.round(pet.progress * 100);

  return (
    <section aria-label={`${pet.name}, thú cưng của bạn`} className="relative overflow-hidden rounded-[1.75rem] border border-line bg-[radial-gradient(90%_130%_at_0%_0%,rgb(255_160_120/0.18),transparent_62%),var(--color-ink-1)] p-4" data-pet data-pet-mood={pet.mood}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={touch} aria-label={`Chạm vào ${pet.name}`} className="relative shrink-0 rounded-full active:scale-95">
          <span className={clsx('block', hopping && 'pet-hop')} key={poke.at}>
            <Pet mood={pet.mood} outfit={pet.outfit} size={96} waving={pet.mood === 'happy' || pet.mood === 'excited'} label={`${pet.name} ${MOOD_WORDS[pet.mood]}`} />
          </span>
          {hopping && (
            <>
              <Heart x={18} delay={0} />
              <Heart x={44} delay={120} />
              <Heart x={68} delay={240} />
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <b className="font-display text-h3 leading-none text-bone">{pet.name}</b>
            <span className="font-mono text-[0.66rem] tracking-[0.12em] text-bone-faint uppercase">{pet.stage.name}</span>
          </div>
          <p className="mt-1.5 rounded-2xl rounded-tl-md bg-wash/[0.07] px-3 py-2 text-fine leading-snug text-bone" role="status" data-pet-line>
            {line}
          </p>
          <div className="mt-2" aria-label={pet.next ? `Còn ${pet.left} điểm nữa để lên ${pet.next.name}` : 'Mơ đã lớn hết cỡ'}>
            <div className="h-1.5 overflow-hidden rounded-full bg-wash/10" aria-hidden="true">
              <i className="block h-full rounded-full bg-gradient-to-r from-[#ffb08a] to-[#ffd35e] transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
            <small className="mt-1 block font-mono text-[0.64rem] text-bone-faint">{pet.next ? `Còn ${pet.left} điểm nữa để thành ${pet.next.name}` : 'Mơ đã lớn hết cỡ rồi'}</small>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onTab('diary')}>
          <BookHeart size={14} aria-hidden="true" /> Nhật ký
        </Button>
        {pet.stats.streak > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-2.5 py-1 font-mono text-[0.7rem] text-bone-dim">
            <Flame size={12} className="text-signal" aria-hidden="true" /> {pet.stats.streak} ngày liền
          </span>
        )}
        {pet.focusToday > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-2.5 py-1 font-mono text-[0.7rem] text-bone-dim">
            <Timer size={12} aria-hidden="true" /> {pet.focusToday} phút tập trung
          </span>
        )}
      </div>
    </section>
  );
}
