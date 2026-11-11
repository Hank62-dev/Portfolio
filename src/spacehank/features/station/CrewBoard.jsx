import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock, Radio, Send, Sparkles, Timer, TriangleAlert } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { timeAgo } from '../pulse/github';
import { CORE, handoffsIn } from './model';
import { Helmet, shortName, statusWord } from './parts';
import { crewReport, span } from './report';
import { locale, tr } from '../../core/i18n/lang';

// The crew board, under the station, as a mission-control report: the crew as a whole (who is at work, what was given,
// finished and failed, the success rate and the average task), the last twelve hours, the mission log, and the crew
// manifest, one line per crew member with what they are on or how their last task ended. Read from the event log the
// server keeps (the recent part of the day), so it is the picture of now, not a history.

const FILTERS = [
  { id: 'all', label: () => tr('Everyone') },
  { id: 'working', label: () => tr('Working') },
  { id: 'idle', label: () => tr('Free') },
  { id: 'offline', label: () => tr('Offline') },
];

const LAST_WORD = { started: () => tr('Took'), completed: () => tr('Finished'), failed: () => tr('Failed'), output: () => tr('Said'), warning: () => tr('Warned') };
const ACTION_WORD = { output: () => tr('says'), warning: () => tr('warns'), completed: () => tr('finished'), failed: () => tr('failed') };

/** The time now, moved on every few seconds, so the "for 12 min" on the board keeps up. */
const useNow = (every = 10000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
};

const clock = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
const nameOf = (id, crew) => (id === CORE ? tr('You') : shortName(crew.find((a) => a.id === id) ?? { name: id }));

export default function CrewBoard({ crew, events, selected, onSelect, onTask }) {
  const now = useNow();
  const report = useMemo(() => crewReport(events, crew, now), [events, crew, now]);
  const [filter, setFilter] = useState('all');
  const { totals } = report;

  const shown = report.rows
    .filter((row) => filter === 'all' || (filter === 'working' ? row.working : filter === 'offline' ? row.agent.status === 'offline' : !row.working && row.agent.status !== 'offline'))
    .sort((a, b) => Number(b.working) - Number(a.working) || Number(a.agent.status === 'offline') - Number(b.agent.status === 'offline') || b.given + b.done - (a.given + a.done));
  const most = Math.max(1, ...report.rows.map((row) => row.given));
  const atWork = report.rows.filter((row) => row.working);

  return (
    <section className="dark-island station-dash" data-crew-board aria-label={tr('Crew board')}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="station-dash-eyebrow">
            <span className="station-live">
              <i aria-hidden="true" /> {tr('Live')}
            </span>
            {tr('Crew board')} · {clock(now)}
          </p>
          <h2 className="mt-1 font-display text-h3 text-white">{tr('Who is doing what')}</h2>
        </div>
        <div className="station-segments" role="radiogroup" aria-label={tr('Show')}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label()}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={Activity} label={tr('At work')} value={`${totals.working}/${crew.length}`} tone={totals.working ? 'is-ok' : ''}>
          <span className="station-cells" aria-hidden="true">
            {report.rows.map((row) => (
              <i key={row.id} style={row.working ? { background: row.agent.color, boxShadow: `0 0 6px ${row.agent.color}` } : undefined} />
            ))}
          </span>
        </Tile>
        <Tile icon={Send} label={tr('Tasks given')} value={totals.given}>
          <Spark values={report.hours.map((h) => h.given)} color="#6da8ff" />
        </Tile>
        <Tile icon={CheckCircle2} label={tr('Finished')} value={totals.done} tone={totals.done ? 'is-ok' : ''}>
          <Spark values={report.hours.map((h) => h.done)} color="#4cc38a" />
        </Tile>
        <Tile icon={TriangleAlert} label={tr('Failed')} value={totals.failed} tone={totals.failed ? 'is-bad' : ''}>
          <Spark values={report.hours.map((h) => h.failed)} color="#ff7b72" />
        </Tile>
        <Tile icon={CheckCircle2} label={tr('Success rate')} value={totals.successRate == null ? '–' : `${Math.round(totals.successRate * 100)}%`} aside={<Ring share={totals.successRate} />} />
        <Tile icon={Timer} label={tr('Average task')} value={span(totals.avgMs)} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Hours hours={report.hours} />
        <MissionLog events={events} crew={crew} />
      </div>

      <div className="station-panelbox mt-3" role="table" aria-label={tr('Crew manifest')}>
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <p className="station-dash-label">
            <Radio size={11} aria-hidden="true" /> {tr('Crew manifest')}
          </p>
          <span className="font-mono text-[0.62rem] text-white/45">{atWork.length ? tr('{0} at work', atWork.length) : tr('Nobody is at work')}</span>
        </div>
        <div className="station-manifest-row is-head" role="row">
          <span role="columnheader">{tr('Crew')}</span>
          <span role="columnheader">{tr('Status')}</span>
          <span role="columnheader">{tr('Now on / last result')}</span>
          <span role="columnheader" className="is-num">
            {tr('Given')}
          </span>
          <span role="columnheader" className="is-num">
            {tr('Finished')}
          </span>
          <span role="columnheader" className="is-num">
            {tr('Failed')}
          </span>
          <span role="columnheader" className="is-num">
            {tr('Average')}
          </span>
          <span role="columnheader" className="is-num">
            {tr('Load')}
          </span>
          <span role="columnheader" />
        </div>
        {shown.length ? (
          shown.map((row) => <ManifestRow key={row.id} row={row} crew={crew} most={most} now={now} selected={selected === row.id} onSelect={onSelect} onTask={onTask} />)
        ) : (
          <p className="px-4 py-5 text-fine text-white/45">{tr('Nobody here right now.')}</p>
        )}
      </div>
    </section>
  );
}

function Tile({ icon: Icon, label, value, tone = '', aside, children }) {
  return (
    <div className={clsx('station-tile', tone)}>
      <p className="station-dash-label">
        <Icon size={11} aria-hidden="true" /> {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <b className="station-tile-value">{value}</b>
        {aside}
      </div>
      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

/** A small line of the last twelve hours, for a tile. */
function Spark({ values, color }) {
  const top = Math.max(1, ...values);
  const step = 100 / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(22 - (v / top) * 18).toFixed(1)}`).join(' ');
  return (
    <svg className="station-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,24 ${points} 100,24`} fill={color} fillOpacity="0.14" stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** The success rate as a ring. */
function Ring({ share }) {
  const r = 15;
  const length = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="4" />
      {share != null && <circle cx="20" cy="20" r={r} fill="none" stroke="#4cc38a" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${share * length} ${length}`} style={{ filter: 'drop-shadow(0 0 4px #4cc38a)' }} />}
    </svg>
  );
}

/** The last twelve hours: tasks given, finished and failed in each. */
function Hours({ hours }) {
  const top = Math.max(1, ...hours.map((h) => h.given + h.done + h.failed));
  const any = hours.some((h) => h.given + h.done + h.failed);
  return (
    <div className="station-panelbox p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="station-dash-label">
          <Clock size={11} aria-hidden="true" /> {tr('The last 12 hours')}
        </p>
        <span className="flex gap-3 font-mono text-[0.62rem] text-white/50">
          <span className="flex items-center gap-1">
            <i className="station-key is-given" />
            {tr('given')}
          </span>
          <span className="flex items-center gap-1">
            <i className="station-key is-done" />
            {tr('finished')}
          </span>
          <span className="flex items-center gap-1">
            <i className="station-key is-failed" />
            {tr('failed')}
          </span>
        </span>
      </div>
      <div className="station-hours mt-3" role="img" aria-label={tr('Tasks per hour over the last 12 hours')}>
        {hours.map((h) => {
          const total = h.given + h.done + h.failed;
          return (
            <div key={h.start} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${clock(h.start)}: ${h.given} ${tr('given')}, ${h.done} ${tr('finished')}, ${h.failed} ${tr('failed')}`}>
              {total ? (
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-[3px]" style={{ height: `${Math.max(8, (total / top) * 100)}%` }}>
                  <i className="station-bar is-given" style={{ flexGrow: h.given }} />
                  <i className="station-bar is-done" style={{ flexGrow: h.done }} />
                  <i className="station-bar is-failed" style={{ flexGrow: h.failed }} />
                </div>
              ) : (
                <i className="block h-[3px] w-full rounded-full bg-white/10" />
              )}
            </div>
          );
        })}
        {!any && <p className="station-hours-empty">{tr('No tasks in the last 12 hours yet.')}</p>}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[0.58rem] text-white/40">
        <span>{clock(hours[0].start)}</span>
        <span>{clock(hours[Math.floor(hours.length / 2)].start)}</span>
        <span>{tr('now')}</span>
      </div>
    </div>
  );
}

/** What has been happening: hand-offs as "A → B: task", and the crew's other news, newest first. */
function MissionLog({ events, crew }) {
  const byId = Object.fromEntries(crew.map((a) => [a.id, a]));
  const ids = crew.map((a) => a.id);
  const items = (events ?? []).slice(0, 30).flatMap((event) => {
    const [handoff] = handoffsIn([event], ids);
    if (handoff) return [{ kind: 'handoff', key: event.id ?? handoff.id, time: event.time, ...handoff }];
    const who = event.agentId ?? event.agent;
    return byId[who] ? [{ kind: 'news', key: event.id ?? `${who}-${event.text}`, time: event.time, who, action: event.action, text: event.text }] : [];
  });
  return (
    <div className="station-panelbox flex flex-col p-4" data-mission-log aria-label={tr('Mission log')}>
      <p className="station-dash-label">
        <Sparkles size={11} aria-hidden="true" /> {tr('Mission log')}
      </p>
      {items.length ? (
        <ol className="station-log mt-3">
          {items.map((item) => (
            <li key={item.key}>
              <time className="font-mono text-[0.6rem] text-white/35 tabular-nums">{item.time}</time>
              {item.kind === 'handoff' ? (
                <span className="flex min-w-0 items-start gap-2 text-fine">
                  <span className="mt-0.5 flex shrink-0 items-center gap-1">
                    {item.from === CORE ? <span className="station-mini-core" aria-hidden="true" /> : <Helmet agent={byId[item.from]} size={18} />}
                    <ArrowRight size={11} className="text-white/40" aria-hidden="true" />
                    <Helmet agent={byId[item.to]} size={18} />
                  </span>
                  <span className="min-w-0 leading-snug text-white/65">
                    <b className="font-medium text-white">{nameOf(item.from, crew)}</b> → <b className="font-medium text-white">{shortName(byId[item.to])}</b>
                    {item.text && <span className="block truncate">{item.text}</span>}
                  </span>
                </span>
              ) : (
                <span className="flex min-w-0 items-start gap-2 text-fine">
                  <Helmet agent={byId[item.who]} size={18} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 leading-snug text-white/65">
                    <b className="font-medium text-white">{shortName(byId[item.who])}</b> {ACTION_WORD[item.action]?.() ?? ''}
                    {item.text && <span className="block truncate font-mono text-[0.68rem] text-white/45">{item.text}</span>}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="station-log-empty">{tr('Nothing yet. The first task you give shows up here.')}</p>
      )}
    </div>
  );
}

/** One crew member in the manifest: who, how they are, what they are on (or how their last task ended), their tally. */
function ManifestRow({ row, crew, most, now, selected, onSelect, onTask }) {
  const { agent, current, last } = row;
  const offline = agent.status === 'offline';
  const tone = row.working ? 'busy' : offline ? 'offline' : 'idle';
  const giver = current?.from === CORE || !current ? tr('from you') : tr('from {0}', nameOf(current.from, crew));
  const label = tr('Give {0} a task', shortName(agent));
  return (
    <div className={clsx('station-manifest-row', selected && 'is-selected', offline && 'is-offline')} role="row" style={{ '--c': agent.color }}>
      <button type="button" role="cell" className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => onSelect(selected ? null : agent.id)} aria-pressed={selected}>
        <Helmet agent={agent} size={30} />
        <span className="min-w-0 leading-tight">
          <b className="block truncate text-fine font-medium text-white">{shortName(agent)}</b>
          <small className="block truncate text-[0.66rem] text-white/45">{agent.role}</small>
        </span>
      </button>
      <span role="cell" className="station-pill" data-tone={tone}>
        <i aria-hidden="true" /> {statusWord(agent.status)}
      </span>
      <span role="cell" className="station-manifest-now min-w-0">
        {row.working ? (
          <>
            <span className="block truncate text-fine text-white">{current?.title || tr('A task')}</span>
            <span className="station-progress mt-1.5 block" role="progressbar" aria-label={tr('{0} is working', shortName(agent))} aria-valuetext={tr('Working')}>
              <i />
            </span>
            <small className="mt-1 block truncate font-mono text-[0.6rem] text-white/45">
              {row.elapsedMs != null ? tr('for {0}', span(row.elapsedMs)) : tr('in progress')} · {current?.updates === 1 ? tr('1 update') : tr('{0} updates', current?.updates ?? 0)} · {giver}
            </small>
          </>
        ) : last ? (
          <span className="block truncate text-fine text-white/60">
            <span className={clsx('font-medium', last.action === 'failed' ? 'text-[#ff7b72]' : last.action === 'completed' ? 'text-[#4cc38a]' : 'text-white')}>{LAST_WORD[last.action]?.() ?? ''}:</span> {last.text}
            {last.at != null && <span className="font-mono text-[0.6rem] text-white/35"> · {timeAgo(last.at, now)}</span>}
          </span>
        ) : (
          <span className="text-fine text-white/30">—</span>
        )}
      </span>
      <span role="cell" className="is-num">
        {row.given}
      </span>
      <span role="cell" className={clsx('is-num', row.done && 'text-[#4cc38a]')}>
        {row.done}
      </span>
      <span role="cell" className={clsx('is-num', row.failed && 'text-[#ff7b72]')}>
        {row.failed}
      </span>
      <span role="cell" className="is-num">
        {span(row.avgMs)}
      </span>
      <span role="cell" className="is-num">
        <span className="station-load" title={tr('Share of the tasks given')}>
          <i style={{ width: `${(row.given / most) * 100}%` }} />
        </span>
      </span>
      <button type="button" role="cell" onClick={() => onTask?.(agent.id)} aria-label={label} title={label} className="station-task-btn is-compact">
        <Send size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
