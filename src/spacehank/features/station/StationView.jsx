import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Maximize2, Minimize2, Rocket, Send, X } from 'lucide-react';
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
// reaches lights up. The station takes the whole width; choosing someone flies the camera to them and their card opens
// beside them, inside the station. Under it, the crew board: the report of who does what.

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
  const giveTo = (agentId) => {
    leaveFull();
    onTask?.(agentId);
  };
  const giveTask = () => giveTo(selected ?? undefined);

  return (
    <div className="flex flex-col gap-5" data-station>
      <PageHead keepOnPhone eyebrow={tr('Mission control')} title={tr('SpaceWork')} accent="AI." description={tr('Your AI crew on one station. Give someone a task and watch it fly to their desk.')}>
        <Button onClick={giveTask}>
          <Send size={15} aria-hidden="true" /> {tr('Give a task')}
        </Button>
      </PageHead>

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
        {active && <CrewPanel key={active.id} agent={active} onClose={() => onSelect(null)} onTask={giveTo} />}
        <p className="station-hint">{phone ? tr('Drag to turn · pinch to zoom') : tr('Drag to turn · scroll to zoom · click a desk')}</p>
      </section>

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

/** The chosen crew member's card, inside the station beside them (the camera flies them to the left of it). */
function CrewPanel({ agent, onClose, onTask }) {
  const tone = statusTone(agent.status);
  return (
    <section className="station-panel" data-crew-card style={{ '--c': agent.color }} aria-label={agent.name}>
      <i className="station-panel-corner is-tl" aria-hidden="true" />
      <i className="station-panel-corner is-br" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <Helmet agent={agent} size={46} />
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate font-display text-lead text-white">{agent.name}</h2>
          <p className="truncate text-fine text-white/60">{agent.role}</p>
        </div>
        <button type="button" className="station-panel-close" onClick={onClose} aria-label={tr('Close')}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="station-status mt-3" data-tone={tone}>
        <i aria-hidden="true" /> {statusWord(agent.status)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[0.68rem]">
        <div className="station-fact">
          <dt>{tr('Model')}</dt>
          <dd>{agent.model}</dd>
        </div>
        <div className="station-fact">
          <dt>{tr('Module')}</dt>
          <dd>{agent.room}</dd>
        </div>
        {outfitOf(agent.id).wear && (
          <div className="station-fact col-span-2 max-sm:hidden">
            <dt>{tr('Wears')}</dt>
            <dd>{outfitOf(agent.id).wear}</dd>
          </div>
        )}
      </dl>
      <p className="station-panel-task">{tone === 'offline' ? tr('No worker is connected for {0} yet.', shortName(agent)) : agent.task}</p>
      <button type="button" className="station-panel-go" onClick={() => onTask(agent.id)}>
        <Send size={13} aria-hidden="true" /> {tr('Give {0} a task', shortName(agent))}
      </button>
    </section>
  );
}
