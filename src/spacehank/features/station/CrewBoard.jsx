import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, Crown, Send, Timer, TriangleAlert } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { timeAgo } from '../pulse/github';
import { CORE } from './model';
import { Helmet, shortName, statusWord } from './parts';
import { crewReport, span } from './report';
import { locale, tr } from '../../core/i18n/lang';

// The crew's board, under the station: how the crew is doing as a whole, how busy it has been hour by hour, and a card for
// each crew member (what they are on, since when, who gave it, and what they have finished or failed). Read from the
// event log the server keeps (the recent part of the day), so it is the picture of now, not a history.

const FILTERS = [
  { id: 'all', label: () => tr('Everyone') },
  { id: 'working', label: () => tr('Working') },
  { id: 'idle', label: () => tr('Free') },
  { id: 'offline', label: () => tr('Offline') },
];

/** The time now, moved on every few seconds, so the "for 12 min" on the cards keeps up. */
const useNow = (every = 10000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
};

export default function CrewBoard({ crew, events, selected, onSelect, onTask }) {
  const now = useNow();
  const report = useMemo(() => crewReport(events, crew, now), [events, crew, now]);
  const [filter, setFilter] = useState('all');
  const { totals } = report;

  const shown = report.rows
    .filter((row) => filter === 'all' || (filter === 'working' ? row.working : filter === 'offline' ? row.agent.status === 'offline' : !row.working && row.agent.status !== 'offline'))
    .sort((a, b) => Number(b.working) - Number(a.working) || Number(a.agent.status === 'offline') - Number(b.agent.status === 'offline') || b.given + b.done - (a.given + a.done));
  const most = Math.max(1, ...report.rows.map((row) => row.given));

  return (
    <section className="flex flex-col gap-4" data-crew-board aria-label={tr('Crew board')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Crew board')}</p>
          <h2 className="font-display text-h3 text-bone">{tr('Who is doing what')}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr('Show')}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className={clsx('rounded-full border px-3 py-1 font-mono text-[0.7rem] transition-colors', filter === f.id ? 'border-signal bg-signal-soft text-bone' : 'border-line text-bone-dim hover:text-bone')}>
              {f.label()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <Figure icon={Activity} label={tr('At work')} value={`${totals.working}/${crew.length}`} tone={totals.working ? 'text-ok' : 'text-bone'} />
        <Figure icon={Send} label={tr('Tasks given')} value={totals.given} />
        <Figure icon={CheckCircle2} label={tr('Finished')} value={totals.done} tone={totals.done ? 'text-ok' : 'text-bone'} />
        <Figure icon={TriangleAlert} label={tr('Failed')} value={totals.failed} tone={totals.failed ? 'text-danger' : 'text-bone'} />
        <Figure icon={CheckCircle2} label={tr('Success rate')} value={totals.successRate == null ? '–' : `${Math.round(totals.successRate * 100)}%`} />
        <Figure icon={Timer} label={tr('Average task')} value={span(totals.avgMs)} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Hours hours={report.hours} />
        <Busiest report={report} onSelect={onSelect} />
      </div>

      {shown.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((row) => (
            <CrewRow key={row.id} row={row} crew={crew} most={most} now={now} selected={selected === row.id} onSelect={onSelect} onTask={onTask} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong p-5 text-fine text-bone-faint">{tr('Nobody here right now.')}</p>
      )}
    </section>
  );
}

function Figure({ icon: Icon, label, value, tone = 'text-bone' }) {
  return (
    <div className="station-card !p-3.5">
      <p className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.12em] text-bone-faint uppercase">
        <Icon size={11} aria-hidden="true" /> {label}
      </p>
      <b className={clsx('mt-1 block font-display text-h3 leading-none font-normal tabular-nums', tone)}>{value}</b>
    </div>
  );
}

/** The last twelve hours: tasks given, finished and failed in each. */
function Hours({ hours }) {
  const top = Math.max(1, ...hours.map((h) => h.given + h.done + h.failed));
  const any = hours.some((h) => h.given + h.done + h.failed);
  return (
    <div className="station-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.12em] text-bone-faint uppercase">
          <Clock size={11} aria-hidden="true" /> {tr('The last 12 hours')}
        </p>
        <span className="flex gap-3 font-mono text-[0.62rem] text-bone-faint">
          <span className="flex items-center gap-1"><i className="station-key is-given" />{tr('given')}</span>
          <span className="flex items-center gap-1"><i className="station-key is-done" />{tr('finished')}</span>
          <span className="flex items-center gap-1"><i className="station-key is-failed" />{tr('failed')}</span>
        </span>
      </div>
      <div className="mt-3 flex h-28 items-end gap-1.5" role="img" aria-label={tr('Tasks per hour over the last 12 hours')}>
        {hours.map((h) => {
          const total = h.given + h.done + h.failed;
          const label = new Date(h.start).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={h.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${label}: ${h.given} ${tr('given')}, ${h.done} ${tr('finished')}, ${h.failed} ${tr('failed')}`}>
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-md" style={{ height: `${total ? Math.max(8, (total / top) * 100) : 4}%` }}>
                {total ? (
                  <>
                    <i className="station-bar is-given" style={{ flexGrow: h.given }} />
                    <i className="station-bar is-done" style={{ flexGrow: h.done }} />
                    <i className="station-bar is-failed" style={{ flexGrow: h.failed }} />
                  </>
                ) : (
                  <i className="h-full w-full bg-line" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.58rem] text-bone-faint">
        <span>{new Date(hours[0].start).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</span>
        <span>{tr('now')}</span>
      </div>
      {!any && <p className="mt-2 text-fine text-bone-faint">{tr('No tasks in the last 12 hours yet.')}</p>}
    </div>
  );
}

/** Who has done the most, as a ranked list of shares. */
function Busiest({ report, onSelect }) {
  const ranked = report.rows.filter((row) => row.given + row.done > 0).sort((a, b) => b.given + b.done - (a.given + a.done)).slice(0, 5);
  const top = Math.max(1, ...ranked.map((row) => row.given + row.done));
  return (
    <div className="station-card">
      <p className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.12em] text-bone-faint uppercase">
        <Crown size={11} aria-hidden="true" /> {tr('Busiest')}
      </p>
      {ranked.length ? (
        <ol className="mt-3 flex flex-col gap-2">
          {ranked.map((row, i) => (
            <li key={row.id}>
              <button type="button" onClick={() => onSelect(row.id)} className="flex w-full items-center gap-2.5 text-left">
                <span className="w-3 font-mono text-[0.66rem] text-bone-faint">{i + 1}</span>
                <Helmet agent={row.agent} size={22} />
                <span className="w-16 truncate text-fine text-bone">{shortName(row.agent)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <i className="block h-full rounded-full" style={{ width: `${((row.given + row.done) / top) * 100}%`, background: row.agent.color }} />
                </span>
                <span className="w-14 text-right font-mono text-[0.66rem] text-bone-dim tabular-nums">
                  {row.done}/{row.given}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-fine text-bone-faint">{tr('Nobody has had a task yet.')}</p>
      )}
    </div>
  );
}

const LAST_WORD = { started: () => tr('Took'), completed: () => tr('Finished'), failed: () => tr('Failed'), output: () => tr('Said'), warning: () => tr('Warned') };

/** One crew member's card: what they are on and how it is going, or how their last task ended. */
function CrewRow({ row, crew, most, now, selected, onSelect, onTask }) {
  const { agent, current } = row;
  const offline = agent.status === 'offline';
  const giver = current?.from === CORE || !current ? tr('from you') : tr('from {0}', shortName(crew.find((a) => a.id === current.from) ?? { name: current.from }));
  return (
    <li>
      <article className={clsx('station-card station-row h-full', selected && 'is-selected', offline && 'opacity-70')} style={{ '--c': agent.color }}>
        <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onSelect(selected ? null : agent.id)} aria-pressed={selected}>
          <Helmet agent={agent} size={40} />
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block truncate text-body font-medium text-bone">{agent.name}</b>
            <small className="block truncate text-fine text-bone-dim">{agent.role}</small>
          </span>
          <span className="station-status" data-tone={row.working ? 'busy' : offline ? 'offline' : 'idle'}>
            <i aria-hidden="true" /> {statusWord(agent.status)}
          </span>
        </button>

        <div className="mt-3 min-h-[4.2rem]">
          {row.working ? (
            <>
              <p className="line-clamp-2 text-fine text-bone">{current.title || tr('A task')}</p>
              <div className="station-progress mt-2" role="progressbar" aria-label={tr('{0} is working', shortName(agent))} aria-valuetext={tr('Working')}>
                <i />
              </div>
              <p className="mt-1.5 font-mono text-[0.64rem] text-bone-faint">
                {row.elapsedMs != null ? tr('for {0}', span(row.elapsedMs)) : tr('in progress')} · {current.updates === 1 ? tr('1 update') : tr('{0} updates', current.updates)} · {giver}
              </p>
            </>
          ) : row.last ? (
            <>
              <p className="line-clamp-2 text-fine text-bone-dim">
                <span className={clsx('font-medium', row.last.action === 'failed' ? 'text-danger' : row.last.action === 'completed' ? 'text-ok' : 'text-bone')}>{LAST_WORD[row.last.action]?.() ?? ''}:</span> {row.last.text}
              </p>
              {row.last.at != null && <p className="mt-1.5 font-mono text-[0.64rem] text-bone-faint">{timeAgo(row.last.at, now)}</p>}
            </>
          ) : (
            <p className="text-fine text-bone-faint">{offline ? tr('No worker is connected for {0} yet.', shortName(agent)) : tr('Free, waiting for a task.')}</p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-line pt-3 text-center font-mono">
          <Stat label={tr('given')} value={row.given} />
          <Stat label={tr('finished')} value={row.done} tone={row.done ? 'text-ok' : undefined} />
          <Stat label={tr('failed')} value={row.failed} tone={row.failed ? 'text-danger' : undefined} />
          <Stat label={tr('average')} value={span(row.avgMs)} />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-line" title={tr('Share of the tasks given')}>
            <i className="block h-full rounded-full" style={{ width: `${(row.given / most) * 100}%`, background: agent.color }} />
          </span>
          <button type="button" onClick={() => onTask?.(agent.id)} className="inline-flex items-center gap-1 font-mono text-[0.66rem] text-bone-dim hover:text-bone">
            <Send size={11} aria-hidden="true" /> {tr('Give a task')}
          </button>
        </div>
      </article>
    </li>
  );
}

function Stat({ label, value, tone }) {
  return (
    <span className="min-w-0">
      <b className={clsx('block truncate text-fine font-semibold text-bone tabular-nums', tone)}>{value}</b>
      <small className="block truncate text-[0.56rem] tracking-[0.08em] text-bone-faint uppercase">{label}</small>
    </span>
  );
}

