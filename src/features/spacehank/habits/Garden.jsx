import { useEffect, useRef, useState } from 'react';
import { clsx } from '../../../lib/format';
import { skyOf } from '../today/sky';
import { dayKey, gardenLine, toggleDay } from './model';
import { gardenPlants, newlyWatered } from './plants';
import { habits } from './store';
import Plant from './Plant';
import { tr } from '../lang';

const DROPS = [-14, -6, 2, 10, 18];

/**
 * The garden as a small landscape: the sky of this hour behind (the same one as on the home screen), two hills in front, and
 * every habit standing on them as its plant. Touch a plant to water it; when one is watered (here or in the list) it rains
 * on that plant for a moment. The scene is one picture, so it looks the same in the light and the dark theme.
 */
export default function Garden({ items }) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const sky = skyOf(hour);
  const key = dayKey(now);
  const plants = gardenPlants(items, now);
  const done = plants.filter((p) => p.doneToday).length;

  // rain on a plant that has just been watered
  const before = useRef(null);
  const [rain, setRain] = useState({});
  useEffect(() => {
    const now = new Set(items.filter((h) => h.days.includes(key)).map((h) => h.id));
    const fresh = before.current ? newlyWatered(before.current, now) : [];
    before.current = now;
    if (!fresh.length) return undefined;
    const stamp = Date.now();
    setRain((all) => ({ ...all, ...Object.fromEntries(fresh.map((id) => [id, stamp])) }));
    const timer = window.setTimeout(() => setRain({}), 1800);
    return () => window.clearTimeout(timer);
  }, [items, key]);

  const water = (plant) => {
    if (plant.doneToday) return;
    const habit = items.find((h) => h.id === plant.id);
    if (!habit) return;
    navigator.vibrate?.(10);
    void habits.update(habit.id, { days: toggleDay(habit.days, key) });
  };

  return (
    <section
      className="garden-scene min-h-[12.5rem]"
      style={{ '--sky-top': sky.top, '--sky-mid': sky.mid, '--sky-low': sky.low, '--orb-x': `${sky.orb.x}%`, '--orb-y': `${Math.min(sky.orb.y, 56)}%` }}
      aria-label={tr('The garden')}
      data-garden
    >
      <span className="sky-stars" style={{ opacity: sky.stars }} aria-hidden="true" />
      <span className="sky-orb" data-kind={sky.orb.kind} aria-hidden="true" />
      <p className="relative z-[3] m-4 inline-block max-w-[75%] rounded-full border border-white/20 bg-black/25 px-3 py-1.5 font-mono text-[0.7rem] text-white/90 backdrop-blur-md">{gardenLine(done, plants.length)}</p>

      <svg className="garden-hill" viewBox="0 0 400 90" preserveAspectRatio="none" height="90" aria-hidden="true">
        <path d="M0 48 C70 18 150 30 220 46 C290 62 350 36 400 28 L400 90 L0 90Z" style={{ fill: `color-mix(in srgb, ${sky.low} 22%, hsl(150 30% 6%))` }} />
        <path d="M0 68 C80 52 170 60 250 70 C320 78 370 62 400 58 L400 90 L0 90Z" style={{ fill: `color-mix(in srgb, ${sky.low} 10%, hsl(150 32% 5%))` }} />
      </svg>

      <ul className="garden-plants no-scrollbar absolute inset-x-0 bottom-3 flex items-end justify-start gap-2 overflow-x-auto px-4" aria-label={tr('Habits')}>
        {plants.map((plant) => (
          <li key={plant.id} className="relative w-16 shrink-0 first:ml-auto last:mr-auto">
            {rain[plant.id] && (
              <span key={rain[plant.id]} className="pointer-events-none absolute inset-x-0 top-0 h-0" aria-hidden="true">
                {DROPS.map((dx, i) => (
                  <i key={dx} className="drop" style={{ '--dx': `${dx}px`, '--dd': `${i * 90}ms` }} />
                ))}
              </span>
            )}
            <button type="button" onClick={() => water(plant)} disabled={plant.doneToday} aria-label={plant.doneToday ? plant.name : tr('Water {0}', plant.name)} className="block w-full active:scale-95 disabled:cursor-default">
              <Plant stage={plant.stage} wilting={plant.wilting} hue={plant.hue} className={clsx('mx-auto h-[4.6rem] w-14')} />
            </button>
            <span className="mt-0.5 block truncate text-center font-mono text-[0.58rem] text-white/75">{plant.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
