import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Maximize2, Minimize2, Rocket, Send, Sparkles } from 'lucide-react';
import { Button, Loading } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { PageHead } from '../../ui/Page';
import { AGENTS, isWorking } from '../../core/agents';
import { CORE, handoffsIn, statusTone } from './model';
import { Helmet, shortName, statusWord } from './parts';
import CrewBoard from './CrewBoard';
import { outfitOf } from './outfits';
import { tr } from '../../core/i18n/lang';
import './station.css';

// SpaceWorkAI: the AI crew on a space station, in 3D. The owner is the core in the middle; the crew sit at their desks
// round the ring. When someone gives someone a task, a small craft flies from the one to the other, and the desk it
// reaches lights up. Beside it: the chosen crew member, and the mission log.

// three.js and the scene only download when the station is opened
const Station3D = lazy(() => import('./Station3D'));
const FLIGHT_MS = 1800;

/** Who a hand-off came from, as a name. */
const nameOf = (id, crew) => (id === CORE ? tr('You') : shortName(crew.find((a) => a.id === id) ?? { name: id }));

export default function StationView({ agents, events, selected, onSelect, paused, onTask }) {
  const crew = useMemo(() => (agents?.length ? agents : AGENTS.map((a) => ({ ...a, status: 'offline' }))), [agents]);
  const phone = useMediaQuery('(max-width: 640px)');
  const handoffs = useMemo(() => handoffsIn(events, crew.map((a) => a.id)), [events, crew]);

  // the hand-offs that arrive while the station is open fly; the ones already there are drawn as faint links only
  const seen = useRef(null);
  const [flights, setFlights] = useState([]);
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(handoffs.map((h) => h.id));
      return undefined;
    }
    const fresh = handoffs.filter((h) => !seen.current.has(h.id));
    if (!fresh.length) return undefined;
    fresh.forEach((h) => seen.current.add(h.id));
    setFlights((now) => [...now, ...fresh.map((h) => ({ ...h, key: `${h.id}-${Date.now()}` }))]);
    const timer = setTimeout(() => setFlights((now) => now.filter((f) => !fresh.some((h) => h.id === f.id))), FLIGHT_MS + 1200);
    return () => clearTimeout(timer);
  }, [handoffs]);

  const working = crew.filter(isWorking).length;
  const active = crew.find((a) => a.id === selected) ?? null;
  const { stage, full, toggleFull, leaveFull } = useFullStage();
  // the task dialog opens over the page, so the station leaves full screen first
  const giveTask = () => {
    leaveFull();
    onTask?.(selected ?? undefined);
  };

  return (
    <div className="flex flex-col gap-5" data-station>
      <PageHead keepOnPhone eyebrow={tr('Mission control')} title={tr('SpaceWork')} accent="AI." description={tr('Your AI crew on one station. Give someone a task and watch it fly to their desk.')}>
        <Button onClick={giveTask}>
          <Send size={15} aria-hidden="true" /> {tr('Give a task')}
        </Button>
      </PageHead>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section ref={stage} aria-label={tr('The station')} className={clsx('dark-island station-stage', paused && 'is-paused', full && 'is-full')}>
          <Suspense fallback={<Loading label={tr('Loading the station')} className="station-loading" />}>
            <Station3D crew={crew} handoffs={handoffs} flights={flights} selected={selected} onSelect={onSelect} onCore={giveTask} paused={paused} phone={phone} />
          </Suspense>

          <div className="station-hud" aria-live="polite">
            <span>
              <b>{crew.length}</b> {tr('crew')}
            </span>
            <span className={clsx(working && 'is-working')}>
              <b>{working}</b> {tr('at work')}
            </span>
            {flights.at(-1) && (
              <span className="station-hud-flight">
                <Rocket size={11} aria-hidden="true" /> {nameOf(flights.at(-1).from, crew)} <ArrowRight size={10} aria-hidden="true" /> {nameOf(flights.at(-1).to, crew)}
              </span>
            )}
          </div>
          <button type="button" className="station-zoom" onClick={toggleFull} aria-pressed={full} aria-label={full ? tr('Exit full screen') : tr('Full screen')} title={full ? tr('Exit full screen') : tr('Full screen')}>
            {full ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
          </button>
          <p className="station-hint">{phone ? tr('Drag to turn · pinch to zoom') : tr('Drag to turn · scroll to zoom · click a desk')}</p>
        </section>

        <aside className="flex flex-col gap-4">
          <CrewCard agent={active} onTask={onTask} />
          <MissionLog events={events} crew={crew} />
        </aside>
      </div>

      <CrewBoard crew={crew} events={events} selected={selected} onSelect={onSelect} onTask={onTask} />
    </div>
  );
}

/**
 * The station filling the screen: the browser's full screen where it lets an element have it, else the stage laid over
 * the page (iPhone Safari). Esc leaves either way.
 */
function useFullStage() {
  const stage = useRef(null);
  const [full, setFull] = useState(false);
  const native = useRef(false);

  useEffect(() => {
    const onChange = () => {
      const on = Boolean(stage.current) && document.fullscreenElement === stage.current;
      if (native.current && !on) native.current = false;
      if (native.current || on) setFull(on);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // the laid-over stage: the page under it holds still, and Esc closes it
  useEffect(() => {
    if (!full || native.current) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  // leaving the station leaves full screen too
  useEffect(() => () => native.current && document.fullscreenElement && document.exitFullscreen?.(), []);

  const leaveFull = () => {
    if (native.current && document.fullscreenElement) document.exitFullscreen?.();
    else setFull(false);
  };
  const toggleFull = () => {
    if (full) return leaveFull();
    const el = stage.current;
    if (el?.requestFullscreen && document.fullscreenEnabled) {
      native.current = true;
      el.requestFullscreen().then(
        () => setFull(true),
        () => {
          native.current = false;
          setFull(true);
        }
      );
    } else setFull(true);
  };

  return { stage, full, toggleFull, leaveFull };
}

/** The chosen crew member, or a word on how the station works when nobody is chosen. */
function CrewCard({ agent, onTask }) {
  if (!agent) {
    return (
      <section className="station-card" data-crew-card>
        <p className="font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Crew')}</p>
        <p className="mt-2 text-fine text-bone-dim">{tr('Tap a desk to see who sits there and what they are doing. Tap the core in the middle to give a task.')}</p>
      </section>
    );
  }
  const tone = statusTone(agent.status);
  return (
    <section className="station-card" data-crew-card style={{ '--c': agent.color }}>
      <div className="flex items-center gap-3">
        <Helmet agent={agent} size={52} />
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate font-display text-lead text-bone">{agent.name}</h2>
          <p className="truncate text-fine text-bone-dim">{agent.role}</p>
        </div>
        <span className="station-status" data-tone={tone}>
          <i aria-hidden="true" /> {statusWord(agent.status)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-[0.7rem]">
        <div className="station-fact">
          <dt>{tr('Model')}</dt>
          <dd>{agent.model}</dd>
        </div>
        <div className="station-fact">
          <dt>{tr('Module')}</dt>
          <dd>{agent.room}</dd>
        </div>
        {outfitOf(agent.id).wear && (
          <div className="station-fact col-span-2">
            <dt>{tr('Wears')}</dt>
            <dd>{outfitOf(agent.id).wear}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 rounded-2xl border border-line bg-ink-2/60 px-3 py-2 text-fine text-bone-dim">{tone === 'offline' ? tr('No worker is connected for {0} yet.', shortName(agent)) : agent.task}</p>
      <Button className="mt-3 w-full" variant="ghost" onClick={() => onTask?.(agent.id)}>
        <Send size={14} aria-hidden="true" /> {tr('Give {0} a task', shortName(agent))}
      </Button>
    </section>
  );
}

const ACTION_WORD = { output: () => tr('says'), warning: () => tr('warns'), completed: () => tr('finished'), failed: () => tr('failed') };

/** What has been happening: hand-offs as "A → B: task", and the crew's other news. */
function MissionLog({ events, crew }) {
  const byId = Object.fromEntries(crew.map((a) => [a.id, a]));
  const ids = crew.map((a) => a.id);
  const items = (events ?? []).slice(0, 14).flatMap((event) => {
    const [handoff] = handoffsIn([event], ids);
    if (handoff) return [{ kind: 'handoff', key: event.id ?? handoff.id, ...handoff }];
    const who = event.agentId ?? event.agent;
    return byId[who] ? [{ kind: 'news', key: event.id ?? `${who}-${event.text}`, who, action: event.action, text: event.text }] : [];
  });
  return (
    <section className="station-card" data-mission-log aria-label={tr('Mission log')}>
      <p className="flex items-center gap-1.5 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">
        <Sparkles size={11} aria-hidden="true" /> {tr('Mission log')}
      </p>
      {items.length ? (
        <ol className="mt-3 flex flex-col gap-2.5">
          {items.map((item) =>
            item.kind === 'handoff' ? (
              <li key={item.key} className="flex items-start gap-2 text-fine">
                <span className="mt-0.5 flex shrink-0 items-center gap-1">
                  {item.from === CORE ? <span className="station-mini-core" aria-hidden="true" /> : <Helmet agent={byId[item.from]} size={18} />}
                  <ArrowRight size={11} className="text-bone-faint" aria-hidden="true" />
                  <Helmet agent={byId[item.to]} size={18} />
                </span>
                <span className="min-w-0 leading-snug text-bone-dim">
                  <b className="font-medium text-bone">{nameOf(item.from, crew)}</b> → <b className="font-medium text-bone">{shortName(byId[item.to])}</b>
                  {item.text && <span className="block truncate">{item.text}</span>}
                </span>
              </li>
            ) : (
              <li key={item.key} className="flex items-start gap-2 text-fine">
                <Helmet agent={byId[item.who]} size={18} className="mt-0.5 shrink-0" />
                <span className="min-w-0 leading-snug text-bone-dim">
                  <b className="font-medium text-bone">{shortName(byId[item.who])}</b> {ACTION_WORD[item.action]?.() ?? ''}
                  {item.text && <span className="block truncate font-mono text-[0.68rem] text-bone-faint">{item.text}</span>}
                </span>
              </li>
            )
          )}
        </ol>
      ) : (
        <p className="mt-2 text-fine text-bone-faint">{tr('Nothing yet. The first task you give shows up here.')}</p>
      )}
    </section>
  );
}
