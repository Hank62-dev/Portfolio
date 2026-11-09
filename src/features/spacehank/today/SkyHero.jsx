import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react';
import { useBriefing } from '../hooks/useBriefing';
import { greetingFor, owner as me } from '../config';
import { CONDITION_TEXT } from '../model/weather';
import { getLang, locale, tr } from '../lang';
import QuickInput from './QuickInput';
import { skyOf } from './sky';

const ICONS = { clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning };

/**
 * The top of the home screen: a sky that is the real sky of this hour and this weather (the colours glide through the day, the
 * sun rises and sets, stars come out at night, clouds grey it when it is overcast), with the greeting set large over it.
 * The words always sit on a dark scrim, so they read in the light theme as well.
 */
export default function SkyHero({ owner = true, onNotify }) {
  const { weather } = useBriefing({ owner });
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const sky = skyOf(hour, weather?.condition);
  const date = now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  // after midnight it is not a good morning yet
  const greeting = now.getHours() < 5 ? tr('It is late') : greetingFor(now.getHours());
  const condition = weather ? CONDITION_TEXT[getLang()]?.[weather.condition] ?? '' : '';
  const WeatherIcon = ICONS[weather?.condition] ?? Sun;
  const kind = weather?.condition ?? 'clear';
  const wet = kind === 'drizzle' || kind === 'rain' || kind === 'storm';
  // by day the clouds drift across; at night the stars are out instead
  const daylight = 1 - sky.stars;
  const ridge = (from, mix) => `color-mix(in srgb, ${from} ${mix}%, hsl(232 38% 5%))`;

  return (
    <header
      className="sky-hero"
      style={{ '--sky-top': sky.top, '--sky-mid': sky.mid, '--sky-low': sky.low, '--orb-x': `${sky.orb.x}%`, '--orb-y': `${sky.orb.y}%` }}
      data-sky-hero
    >
      {/* the sky is the background of the top of the page: it runs edge to edge, behind the cards that follow, and thins out downward */}
      <div className="sky-bg" aria-hidden="true">
        <span className="sky-glow" />
        <span className="sky-stars" style={{ opacity: sky.stars }} />
        <span className="sky-stars sky-stars-b" style={{ opacity: sky.stars }} />
        {sky.stars > 0.6 && <span className="sky-shooting" />}
        <span className="sky-cloud" style={{ opacity: Math.min(1, sky.grey * 1.3) }} />
        <span className="sky-drift a" style={{ opacity: Math.max(0.25, daylight * 0.9) }} />
        <span className="sky-drift b" style={{ opacity: Math.max(0.2, daylight * 0.7) }} />
        <span className="sky-drift c" style={{ opacity: Math.max(0.2, daylight * 0.6) }} />
        {wet && <span className="wx-rain" data-heavy={kind === 'storm' ? '' : undefined} />}
        {kind === 'snow' && <span className="wx-snow" />}
        {kind === 'storm' && <span className="wx-flash" />}
      </div>
      <span className="sky-orb" data-kind={sky.orb.kind} aria-hidden="true" />
      {/* the horizon: three ridges, the far one pale with the sky and the near one nearly black, which melt into the page below */}
      <svg className="sky-ridge" viewBox="0 0 400 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 52 L38 30 L70 46 L118 18 L160 44 L205 26 L250 48 L300 22 L348 42 L400 28 L400 110 L0 110Z" style={{ fill: ridge(sky.low, 42), opacity: 0.55 }} />
        <path d="M0 70 C40 52 78 62 120 50 C170 36 210 66 262 54 C310 44 356 62 400 48 L400 110 L0 110Z" style={{ fill: ridge(sky.mid, 20) }} />
        <path d="M0 88 C60 74 120 90 190 80 C260 70 330 90 400 76 L400 110 L0 110Z" style={{ fill: ridge(sky.low, 8) }} />
      </svg>

      <div className="sky-content rise">
        <div className="mb-auto flex items-start justify-between gap-3">
          <span className="font-mono text-[0.7rem] tracking-[0.16em] text-white/75 uppercase">{date}</span>
        </div>

        <div>
          <h1 className="font-display text-[clamp(2.5rem,10vw,4.6rem)] leading-[0.98] font-normal tracking-tight text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.35)]">
            <span className="sky-line" style={{ '--w': 0 }}>
              {greeting},
            </span>
            <br />
            <em className="sky-name sky-line" style={{ '--w': 1 }}>
              {me.name}.
            </em>
          </h1>
          <p className="mt-3 max-w-[40ch] text-fine leading-relaxed text-white/80">
            {tr('Everything will be fine in the end.')}
            <br />
            {tr("If it's not fine, it's not the end.")}
          </p>
          {weather && (
            <span className="sky-chip mt-4" data-sky-weather>
              <WeatherIcon size={15} strokeWidth={1.8} aria-hidden="true" />
              {weather.temperature}°C{condition ? ` · ${condition}` : ''}
            </span>
          )}
        </div>

        <QuickInput onNotify={onNotify} />
      </div>
    </header>
  );
}
