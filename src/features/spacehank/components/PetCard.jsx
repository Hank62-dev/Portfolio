import { tr } from '../lang';
import { useEffect, useRef, useState } from 'react';
import { Backpack, BookHeart, Check, Compass, Crown, Flame, GraduationCap, Sprout, Timer } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import Pet from '../pet/Pet';
import { STAGES, TAP_LINES } from '../pet/model';
import { usePet } from '../pet/usePet';

const MOOD_WORDS = { calm: tr('đang thong thả'), happy: tr('đang vui'), excited: tr('đang rất phấn khích'), sleepy: tr('đang buồn ngủ'), worried: tr('đang hơi lo'), lonely: tr('đang nhớ bạn') };

// the colour of the scene follows how she feels
const MOOD_HUE = { calm: 160, happy: 46, excited: 330, sleepy: 250, worried: 24, lonely: 214 };
// one icon for each stage of growing up, in the order of STAGES
const STAGE_ICONS = [Sprout, GraduationCap, Backpack, Compass, Crown];

const Heart = ({ x, delay }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" className="pet-heart pointer-events-none absolute top-3" style={{ left: x, animationDelay: `${delay}ms` }} aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.2 5c2 0 3.6 1.1 5.8 3.2C14.2 6.1 15.8 5 17.8 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" fill="#ff7a8a" />
  </svg>
);

/** The five stages as stepping stones on a rail: the ones passed are filled, the one she is on glows, the rail fills as far as she has got. */
function StageRail({ index, progress }) {
  return (
    <ol className="flex items-center" aria-hidden="true">
      {STAGES.map((stage, i) => {
        const Icon = STAGE_ICONS[i] ?? Sprout;
        const state = i < index ? 'done' : i === index ? 'now' : 'next';
        return (
          <li key={stage.id} className={clsx('flex items-center', i < STAGES.length - 1 && 'min-w-0 flex-1')}>
            <span className="pet-stone" data-state={state} title={stage.name}>
              {state === 'done' ? <Check size={12} strokeWidth={3} /> : <Icon size={13} strokeWidth={2} />}
            </span>
            {i < STAGES.length - 1 && (
              <span className="pet-rail">
                <i style={{ width: `${i < index ? 100 : i === index ? Math.round(progress * 100) : 0}%` }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Niú on the home screen: how it is, what it says, how far it has grown, and a way into the diary. Tap her. */
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
  const StageIcon = STAGE_ICONS[pet.index] ?? Sprout;

  return (
    <section aria-label={tr('{0}, thú cưng của bạn', pet.name)} className="pet-card relative overflow-hidden ink-panel rounded-[1.75rem] p-4 sm:p-5" style={{ '--pet-h': MOOD_HUE[pet.mood] ?? 160 }} data-pet data-pet-mood={pet.mood}>
      {/* the scene behind her: a light of her mood's colour, and a few motes drifting up */}
      <span className="pet-scene" aria-hidden="true">
        <i style={{ '--x': '8%', '--d': '0s' }} />
        <i style={{ '--x': '19%', '--d': '-3s' }} />
        <i style={{ '--x': '31%', '--d': '-6s' }} />
        <i style={{ '--x': '86%', '--d': '-2s' }} />
        <i style={{ '--x': '93%', '--d': '-5s' }} />
      </span>

      <div className="relative z-10 flex items-center gap-3 sm:gap-5">
        <button type="button" onClick={touch} aria-label={tr('Chạm vào {0}', pet.name)} className="pet-stage relative shrink-0 rounded-full active:scale-95">
          <span className="pet-aura-disc" aria-hidden="true" />
          <span className={clsx('relative block size-[6.6rem] sm:size-[8.2rem]', hopping && 'pet-hop')} key={poke.at}>
            <Pet mood={pet.mood} outfit={pet.outfit} size="100%" label={`${pet.name} ${MOOD_WORDS[pet.mood]}`} />
          </span>
          <span className="pet-pedestal" aria-hidden="true" />
          {hopping && (
            <>
              <Heart x={18} delay={0} />
              <Heart x={44} delay={120} />
              <Heart x={68} delay={240} />
            </>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <b className="font-display text-[1.9rem] leading-none text-bone">{pet.name}</b>
            <span className="pet-medal">
              <StageIcon size={12} strokeWidth={2.2} aria-hidden="true" />
              {pet.stage.name}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.64rem] text-bone-faint">
              <i className="pet-dot" /> {MOOD_WORDS[pet.mood]}
            </span>
          </div>

          <p key={line} className="pet-bubble mt-2.5" role="status" data-pet-line>
            {line}
          </p>

          <div className="mt-3" aria-label={pet.next ? tr('Còn {0} điểm nữa để lên {1}', pet.left, pet.next.name) : tr('{0} đã lớn hết cỡ', pet.name)}>
            <StageRail index={pet.index} progress={pet.progress} />
            <small className="mt-1.5 block font-mono text-[0.64rem] text-bone-faint">{pet.next ? tr('Còn {0} điểm nữa để thành {1}', pet.left, pet.next.name) : tr('{0} đã lớn hết cỡ rồi', pet.name)}</small>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onTab('diary')}>
          <BookHeart size={14} aria-hidden="true" /> {tr('Nhật ký')}
        </Button>
        {pet.stats.streak > 0 && (
          <span className="pet-chip">
            <Flame size={12} className="text-signal" aria-hidden="true" /> {pet.stats.streak} {tr('ngày liền')}
          </span>
        )}
        {pet.focusToday > 0 && (
          <span className="pet-chip">
            <Timer size={12} aria-hidden="true" /> {pet.focusToday} {tr('phút tập trung')}
          </span>
        )}
      </div>
    </section>
  );
}
