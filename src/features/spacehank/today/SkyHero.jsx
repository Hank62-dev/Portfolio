import { Boxes, SlidersHorizontal } from 'lucide-react';
import { useBriefing } from '../hooks/useBriefing';
import { greetingFor, owner as me } from '../config';
import { CONDITION_TEXT } from '../model/weather';
import { getLang, locale, tr } from '../lang';
import QuickInput from './QuickInput';
import { skyOf } from './sky';

const GLASS = 'inline-flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 font-mono text-[0.76rem] text-white backdrop-blur-md transition-colors hover:bg-white/25 active:scale-95';

/**
 * The top of the home screen: a sky that is the real sky of this hour and this weather (the colours glide through the day, the
 * sun rises and sets, stars come out at night, clouds grey it when it is overcast), with the greeting set large over it.
 * The words always sit on a dark scrim, so they read in the light theme as well.
 */
export default function SkyHero({ owner = true, onTab, onCustomise, onNotify }) {
  const { weather } = useBriefing({ owner });
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const sky = skyOf(hour, weather?.condition);
  const date = now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  // after midnight it is not a good morning yet
  const greeting = now.getHours() < 5 ? tr('It is late') : greetingFor(now.getHours());
  const condition = weather ? CONDITION_TEXT[getLang()]?.[weather.condition] ?? '' : '';

  return (
    <header
      className="sky-hero"
      style={{ '--sky-top': sky.top, '--sky-mid': sky.mid, '--sky-low': sky.low, '--orb-x': `${sky.orb.x}%`, '--orb-y': `${sky.orb.y}%` }}
      data-sky-hero
    >
      {/* the sky is the background of the top of the page: it runs edge to edge, behind the cards that follow, and thins out downward */}
      <div className="sky-bg" aria-hidden="true">
        <span className="sky-stars" style={{ opacity: sky.stars }} />
        <span className="sky-cloud" style={{ opacity: Math.min(1, sky.grey * 1.3) }} />
      </div>
      <span className="sky-orb" data-kind={sky.orb.kind} aria-hidden="true" />

      <div className="sky-content rise">
        <div className="mb-auto flex items-start justify-between gap-3">
          <span className="font-mono text-[0.7rem] tracking-[0.16em] text-white/75 uppercase">{date}</span>
          <div className="flex items-center gap-2">
            <button type="button" className={`${GLASS} max-md:hidden`} onClick={onCustomise}>
              <SlidersHorizontal size={14} aria-hidden="true" /> {tr('Customise')}
            </button>
            <button type="button" className={GLASS} onClick={() => onTab('space')}>
              <Boxes size={14} aria-hidden="true" /> {tr('Open company floor')}
            </button>
          </div>
        </div>

        <div>
          <h1 className="font-display text-[clamp(2.5rem,10vw,4.6rem)] leading-[0.98] font-normal tracking-tight text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.35)] [&_em]:text-white/80 [&_em]:italic">
            {greeting},<br />
            <em>{me.name}.</em>
          </h1>
          <p className="mt-3 max-w-[40ch] text-fine leading-relaxed text-white/80">
            {tr('Everything will be fine in the end.')}
            <br />
            {tr("If it's not fine, it's not the end.")}
          </p>
          {weather && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 font-mono text-[0.74rem] text-white backdrop-blur-md" data-sky-weather>
              {weather.temperature}°C{condition ? ` · ${condition}` : ''}
            </span>
          )}
        </div>

        <QuickInput onNotify={onNotify} />
      </div>
    </header>
  );
}
