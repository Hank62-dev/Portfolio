import { useEffect, useState } from 'react';
import { useLang } from '../../i18n';
import { clsx } from '../../../shared/lib/format';
import { sound } from '../../motion/sound';

const INTERACTIVE = 'a, button, [role="button"], summary, label, select';
const FINE = '(hover: hover) and (pointer: fine)';

/**
 * Four bars that dance while the sound is on and lie flat when it is off. Turning it on also wires the
 * page's hover ticks and click blips. If the visitor had sound on before, the first click anywhere
 * brings it back (browsers will not start audio without a gesture).
 */
const SoundToggle = ({ className }) => {
  const { c } = useLang();
  const [on, setOn] = useState(false);

  useEffect(() => sound.subscribe(setOn), []);

  useEffect(() => {
    if (!sound.wanted()) return undefined;
    const resume = (e) => {
      if (!e.target.closest?.('[data-sound-toggle]')) sound.set(true);
    };
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, []);

  useEffect(() => {
    if (!on) return undefined;
    const fine = window.matchMedia(FINE).matches;
    const over = (e) => {
      const el = e.target.closest?.(INTERACTIVE);
      if (el && !el.contains(e.relatedTarget)) sound.tick();
    };
    const down = (e) => e.target.closest?.(INTERACTIVE) && sound.click();
    if (fine) document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true });
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', down);
    };
  }, [on]);

  return (
    <button
      type="button"
      data-sound-toggle
      className={clsx('group inline-flex h-[34px] items-center gap-2 rounded-sm px-2 font-mono text-fine text-bone-dim transition-colors hover:text-bone', className)}
      aria-pressed={on}
      aria-label={c.nav.sound}
      title={c.nav.sound}
      onClick={() => sound.set(!on)}
    >
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={clsx(
              'w-[2px] origin-bottom rounded-full bg-current',
              on ? 'h-full animate-[sound-bar_0.9s_ease-in-out_infinite_alternate] text-signal motion-reduce:animate-none' : 'h-[3px]'
            )}
            style={{ animationDelay: `${i * -0.23}s` }}
          />
        ))}
      </span>
    </button>
  );
};

export default SoundToggle;
