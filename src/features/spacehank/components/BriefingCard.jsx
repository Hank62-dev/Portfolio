import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Flame,
  MapPin,
  Sparkles,
  Sun,
  Thermometer,
  Timer,
  Wind,
} from 'lucide-react';
import { Badge, Button, Card, Eyebrow, Skeleton } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { aiNote } from '../api/owner';
import { spacehankConfig } from '../config';
import { focusLog } from '../focus/log';
import { hoursMinutes, summarize as summarizeFocus } from '../focus/stats';
import { useBriefing } from '../hooks/useBriefing';
import { demoSchedule } from '../model/demo';
import { isWorking } from '../model/agents';
import { CONDITION_TEXT, summarize } from '../model/weather';
import { useStore } from '../store';
import { getLang, locale, tr } from '../lang';

const ICONS = { clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning };

const clock = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

const GUEST_NOTE = tr('A calm morning on the floor: three agents are already at work, the standup is first, and the afternoon is clear for deep work.');

const TILE = 'flex min-w-0 flex-col gap-3 p-4';

/** A small pill: icon and a value on one line. */
function Chip({ icon: Icon, children, tone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.72rem] whitespace-nowrap tabular-nums',
        tone === 'signal' ? 'border-signal/40 bg-signal-soft text-signal' : 'border-line bg-ink-2 text-bone-dim'
      )}
    >
      <Icon size={12} aria-hidden="true" /> {children}
    </span>
  );
}

function Weather({ weather, problem }) {
  const Icon = ICONS[weather?.condition] ?? Cloud;
  if (!weather) {
    return problem ? (
      <p className="font-mono text-fine text-bone-faint">{problem}</p>
    ) : (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }
  const wet = weather.rainChance != null && weather.rainChance >= 60;
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-signal-soft text-signal">
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="flex items-baseline gap-0.5 leading-none">
          <b className="font-display text-[2.7rem] leading-none text-bone tabular-nums">{weather.temperature}</b>
          <span className="font-display text-lead text-bone-dim">{tr('°C')}</span>
        </div>
        <div className="ml-auto text-right leading-tight">
          <p className="font-display text-lead text-bone italic" data-weather>
            {CONDITION_TEXT[getLang()][weather.condition]}
            <span className="sr-only">
              {' '}
              {tr('in')} {spacehankConfig.home.name}{tr('. Feels like')} {weather.feelsLike}{tr('°, high')} {weather.high}{tr('°, low')} {weather.low}°
              {weather.rainChance != null ? tr(', {0}% chance of rain.', weather.rainChance) : '.'}
            </span>
          </p>
          <small className="font-mono text-[0.72rem] text-bone-faint tabular-nums">
            ↑ {weather.high}° · ↓ {weather.low}°
          </small>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip icon={Thermometer}>{tr('Feels')} {weather.feelsLike}°</Chip>
        <Chip icon={Wind}>{weather.wind} {tr('km/h')}</Chip>
        {weather.rainChance != null && (
          <Chip icon={Droplets} tone={wet ? 'signal' : undefined}>
            {tr('Rain')} {weather.rainChance}%
          </Chip>
        )}
      </div>
    </>
  );
}

/** Today's events as a compact timeline: the one under way glows, the next is accented, finished ones fade. */
function Schedule({ events, next, now }) {
  return (
    <ol className="relative flex flex-col" aria-label={tr('Today\'s events')}>
      <i className="absolute top-2 bottom-2 left-[3.95rem] w-px bg-line" aria-hidden="true" />
      {events.slice(0, 4).map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const live = !event.allDay && start <= now && end > now;
        const done = !event.allDay && end <= now;
        const isNext = event === next && !live;
        return (
          <li key={`${event.start}-${event.title}`} className={clsx('relative flex items-center gap-2.5 py-1.5', done && 'opacity-45')} data-event>
            <time className="w-14 shrink-0 text-right font-mono text-[0.72rem] whitespace-nowrap text-bone-faint tabular-nums">
              {event.allDay ? tr('All day') : clock(event.start)}
            </time>
            <span
              className={clsx('relative z-10 size-2 shrink-0 rounded-full ring-4 ring-ink-1', live ? 'animate-pulse-ring bg-signal' : isNext ? 'bg-signal' : 'bg-bone-faint')}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 leading-tight">
              <b className={clsx('block truncate text-fine font-medium', live || isNext ? 'text-bone' : 'text-bone-dim')}>{event.title}</b>
              {event.location && <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{event.location}</small>}
            </span>
            {live && (
              <Badge tone="signal" dot>
                {tr('NOW')}
              </Badge>
            )}
            {isNext && <Badge>{tr('NEXT')}</Badge>}
          </li>
        );
      })}
      {events.length > 4 && <li className="pl-[4.5rem] font-mono text-[0.68rem] text-bone-faint">+{events.length - 4} {tr('more')}</li>}
    </ol>
  );
}

function EmptyDay({ connected, onPreview }) {
  const Icon = connected ? CalendarDays : CalendarPlus;
  return (
    <div className="flex items-center gap-3 rounded-sm bg-ink-2 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-3 text-bone-faint">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 leading-tight">
        <b className="block text-fine font-medium text-bone">{connected ? tr('Your day is open') : tr('Connect your calendar')}</b>
        <small className="font-mono text-[0.72rem] text-bone-faint">
          {connected ? (
            tr('Nothing on the calendar today.')
          ) : (
            <>
              {tr('Set')} <code className="rounded-sm bg-ink-3 px-1 py-px text-bone-dim">{tr('CALENDAR_ICS_URL')}</code> {tr('on the server.')}
            </>
          )}
        </small>
      </div>
      {onPreview && (
        <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={onPreview}>
          {tr('Preview')}
        </Button>
      )}
    </div>
  );
}

/** The morning briefing, as three compact tiles: weather, today's calendar and, on request, a note from Hank. */
export default function BriefingCard({ owner, agents, connected }) {
  const briefing = useBriefing({ owner });
  const { log: focusSessions } = useStore(focusLog);
  const focusToday = useMemo(() => summarizeFocus(focusSessions), [focusSessions]);
  const { weather, calendarConfigured, problem } = briefing;
  // With no calendar connected, "Preview" shows a made-up day so the timeline can be seen.
  const [preview, setPreview] = useState(false);
  const events = preview && !briefing.events?.length ? demoSchedule() : briefing.events;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const working = connected ? agents.filter(isWorking).length : 0;
  const next = events?.find((e) => new Date(e.end) > now && !e.allDay);

  const askForNote = async () => {
    if (!owner) {
      setNote(GUEST_NOTE);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { text } = await aiNote({
        language: getLang(),
        context: {
          date: now.toDateString(),
          place: spacehankConfig.home.name,
          weather: summarize(weather, getLang()) || 'unknown',
          schedule: (events ?? []).map((e) => `${e.allDay ? 'all day' : clock(e.start)} ${e.title}`),
          agentsWorking: working,
        },
      });
      setNote(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr_1fr]" aria-label={tr('Today\'s briefing')} data-briefing>
      <Card className={TILE}>
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</Eyebrow>
          <span className="inline-flex items-center gap-1 font-mono text-[0.68rem] text-bone-faint max-sm:hidden">
            <MapPin size={11} aria-hidden="true" /> {spacehankConfig.home.name}
          </span>
        </div>
        <Weather weather={weather} problem={problem} />
      </Card>

      <Card className={TILE}>
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{tr('Today')}</Eyebrow>
          {(!owner || preview) && (
            <span className="flex items-center gap-2">
              <Badge>{tr('SAMPLE')}</Badge>
              {preview && (
                <button type="button" className="font-mono text-[0.68rem] text-bone-faint underline hover:text-bone" onClick={() => setPreview(false)}>
                  {tr('Hide')}
                </button>
              )}
            </span>
          )}
        </div>
        {events === null ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : events.length ? (
          <Schedule events={events} next={next} now={now} />
        ) : (
          <EmptyDay connected={calendarConfigured} onPreview={undefined} />
        )}
      </Card>

      <Card className={clsx(TILE, 'border-signal/25 bg-[radial-gradient(120%_100%_at_100%_0%,rgb(255_91_46/0.14),transparent_60%)]')}>
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-signal text-ink-0">
            <Sparkles size={12} aria-hidden="true" />
          </span>
          <Eyebrow>{tr('From Hank')}</Eyebrow>
        </div>
        {note ? (
          <p className="line-clamp-4 font-display text-[1.1rem] leading-snug text-bone" data-note>
            “{note}”
          </p>
        ) : (
          <p className="font-display text-[1.1rem] leading-snug text-bone-dim">
            {working ? tr('{0} agent{1} at work. ', working, working > 1 ? tr('s are') : tr(' is')) : tr('The floor is quiet. ')}
            {next ? tr('Next up: {0} at {1}.', next.title, clock(next.start)) : tr('Ask for a short note on the day.')}
          </p>
        )}
        {(focusToday.today.minutes > 0 || focusToday.streak > 0) && (
          <div className="flex flex-wrap gap-1.5" data-focus-line>
            <Chip icon={Timer}>{tr('Focus')} {hoursMinutes(focusToday.today.minutes)}</Chip>
            {focusToday.streak > 0 && (
              <Chip icon={Flame} tone="signal">
                {focusToday.streak}{tr('-day streak')}
              </Chip>
            )}
          </div>
        )}
        {error && (
          <p className="rounded-sm border border-danger/40 bg-danger/10 px-2.5 py-1.5 font-mono text-[0.72rem] text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-auto">
          <Button variant="ghost" size="sm" loading={busy} onClick={askForNote}>
            <Sparkles size={13} aria-hidden="true" /> {note ? tr('Write another') : tr('Write my briefing')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
