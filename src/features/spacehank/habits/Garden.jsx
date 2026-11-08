import { useEffect, useRef, useState } from 'react';
import { Check, Droplet, Flame } from 'lucide-react';
import { skyOf } from '../today/sky';
import { dayKey, gardenLine, toggleDay } from './model';
import { gardenPlants, newlyWatered } from './plants';
import { habits } from './store';
import Plant from './Plant';
import { tr } from '../lang';

const DROPS = [-14, -6, 2, 10, 18];

/**
 * The top of the Habit screen, as a landscape that is the background of the page: the sky of this hour runs edge to edge from
 * the top bar down (the same one as on the home screen), two hills sit under it, and every habit stands on them as its plant;
 * the hills melt into the paper below. `head` (the page title) is set on the sky. Touch a plant to water it; when one is
 * watered (here or in the list) it rains on that plant for a moment. The parent is `relative isolate`.
 */
export default function Garden({ items, head }) {
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
      className="garden-top flex flex-col gap-4 md:gap-6"
      data-on-sky=""
      style={{ '--sky-top': sky.top, '--sky-mid': sky.mid, '--sky-low': sky.low, '--orb-x': `${sky.orb.x}%`, '--orb-y': `${Math.min(sky.orb.y, 56)}%` }}
      aria-label={tr('The garden')}
      data-garden
    >
      <div className="sky-bg garden-sky" aria-hidden="true">
        <span className="sky-stars" style={{ opacity: sky.stars }} />
      </div>
      <span className="sky-orb" data-kind={sky.orb.kind} aria-hidden="true" />
      <svg className="garden-hill" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 48 C70 18 150 30 220 46 C290 62 350 36 400 28 L400 90 L0 90Z" style={{ fill: `color-mix(in srgb, ${sky.low} 22%, hsl(150 30% 6%))` }} />
        <path d="M0 68 C80 52 170 60 250 70 C320 78 370 62 400 58 L400 90 L0 90Z" style={{ fill: `color-mix(in srgb, ${sky.low} 10%, hsl(150 32% 5%))` }} />
      </svg>

      {head}

      <div className="garden-scene min-h-[12.5rem]">
        <p className="relative z-[3] inline-block max-w-[75%] rounded-full border border-white/20 bg-black/25 px-3 py-1.5 font-mono text-[0.7rem] text-white/90 backdrop-blur-md">{gardenLine(done, plants.length)}</p>

        <ul className="garden-plants no-scrollbar absolute inset-x-0 bottom-3 flex items-end justify-start gap-2 overflow-x-auto" aria-label={tr('Habits')}>
          {plants.map((plant) => (
            <li key={plant.id} className="plant-tile relative w-[5.25rem] shrink-0 first:ml-auto last:mr-auto" data-state={plant.doneToday ? 'done' : plant.wilting ? 'wilting' : 'waiting'} style={{ '--h': plant.hue }}>
              {rain[plant.id] && (
                <span key={rain[plant.id]} className="pointer-events-none absolute inset-x-0 top-0 h-0" aria-hidden="true">
                  {DROPS.map((dx, i) => (
                    <i key={dx} className="drop" style={{ '--dx': `${dx}px`, '--dd': `${i * 90}ms` }} />
                  ))}
                </span>
              )}
              <button type="button" onClick={() => water(plant)} disabled={plant.doneToday} aria-label={plant.doneToday ? plant.name : tr('Water {0}', plant.name)} className="relative block w-full active:scale-95 disabled:cursor-default">
                <span className="plant-glow" aria-hidden="true" />
                <Plant stage={plant.stage} wilting={plant.wilting} hue={plant.hue} className="relative mx-auto h-[5.6rem] w-[4.9rem]" />
                <span className="plant-badge" aria-hidden="true">
                  {plant.doneToday ? <Check size={11} strokeWidth={3} /> : <Droplet size={11} strokeWidth={2.4} />}
                </span>
              </button>
              <span className="plant-name">
                <span className="min-w-0 truncate">{plant.name}</span>
                {plant.streak > 0 && (
                  <b className="plant-streak">
                    <Flame size={9} aria-hidden="true" />
                    {plant.streak}
                  </b>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
