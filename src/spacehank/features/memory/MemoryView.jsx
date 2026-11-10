import { useMemo, useState } from 'react';
import { BrainCircuit, ChevronDown, Search } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { spacehankConfig } from '../../core/config';
import { groupRuns } from './model';
import { tr } from '../../core/i18n/lang';
import { useDebounce } from '../../../shared/hooks/useDebounce';

// the tone of an event, from what the agent did
const TONE = {
  started: { text: 'text-warn', bg: 'bg-warn/12' },
  output: { text: 'text-bone-dim', bg: 'bg-wash/8' },
  completed: { text: 'text-ok', bg: 'bg-ok/12' },
  failed: { text: 'text-danger', bg: 'bg-danger/12' },
  error: { text: 'text-danger', bg: 'bg-danger/12' },
};
const toneOf = (action) => TONE[action] ?? TONE.output;

/** A ring that fills as the memory buffer fills. */
function Ring({ value, max }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div className="relative grid size-20 shrink-0 place-items-center" role="img" aria-label={tr('{0} of {1} signals kept', value, max)}>
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="url(#mem)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
        <defs>
          <linearGradient id="mem" x1="0" x2="1">
            <stop offset="0" stopColor="#ff5b2e" />
            <stop offset="1" stopColor="hsl(var(--tab) 62% 72%)" />
          </linearGradient>
        </defs>
      </svg>
      <b className="font-display text-lead leading-none text-bone tabular-nums">{value}</b>
    </div>
  );
}

function Row({ group, open, onToggle }) {
  const tone = toneOf(group.action);
  const first = group.items[0];
  const many = group.items.length > 1;
  return (
    <li className="rounded-xl transition-colors hover:bg-wash/[0.04]" data-signal>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-2.5 py-2 text-left">
        <span className="grid size-7 shrink-0 place-items-center rounded-full font-mono text-[0.7rem] font-semibold text-ink-0" style={{ background: group.color }}>
          {group.name.slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <b className="shrink-0 text-fine font-medium text-bone">{group.name}</b>
          <span className={clsx('shrink-0 rounded-full px-2 py-px font-mono text-[0.68rem]', tone.text, tone.bg)}>{group.action}</span>
          {many && <span className="shrink-0 rounded-full bg-wash/10 px-1.5 py-px font-mono text-[0.68rem] text-bone-dim tabular-nums">×{group.items.length}</span>}
          <span className={clsx('min-w-0 text-fine text-bone-dim', open ? 'sr-only' : 'truncate')}>{first.text}</span>
        </span>
        <time className={clsx('shrink-0 font-mono text-[0.68rem]', first.time === 'now' ? 'text-signal' : 'text-bone-faint')}>{first.time}</time>
        <ChevronDown size={14} className={clsx('shrink-0 text-bone-faint transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mb-2 ml-12 flex flex-col gap-1.5 border-l border-line pl-4">
          {group.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-fine leading-relaxed break-words text-bone-dim">
              <span className="min-w-0 flex-1">{item.text}</span>
              <time className="shrink-0 pt-0.5 font-mono text-[0.68rem] text-bone-faint">{item.time}</time>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MemoryView({ events }) {
  const [agent, setAgent] = useState('');
  const [query, setQuery] = useState('');
  const search = useDebounce(query);
  const [openKey, setOpenKey] = useState(null);

  const agents = useMemo(() => {
    const map = new Map();
    for (const e of events) map.set(e.name, { name: e.name, color: e.color, count: (map.get(e.name)?.count ?? 0) + 1 });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [events]);

  const shown = useMemo(
    () => events.filter((e) => (!agent || e.name === agent) && (!search.trim() || `${e.name} ${e.action} ${e.text}`.toLowerCase().includes(search.trim().toLowerCase()))),
    [events, agent, search]
  );
  const groups = useMemo(() => groupRuns(shown), [shown]);
  const latest = events[0];
  const latestTone = latest ? toneOf(latest.action) : TONE.output;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4 max-md:justify-end">
        <div className="max-md:hidden">
          <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Long-term context')}</span>
          <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone">
            {tr('Memory')} <em className="serif-accent">{tr('Stream.')}</em>
          </h1>
        </div>
        <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[0.78rem]', events.length ? 'border-ok/40 text-ok' : 'border-warn/40 text-warn')}>
          <i className={clsx('size-1.5 rounded-full', events.length ? 'animate-pulse bg-ok' : 'bg-warn')} aria-hidden="true" /> {events.length ? tr('Synced') : tr('Waiting')}
        </span>
      </header>

      {/* the glance: the newest signal, how full the memory is, and who has been talking */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className="relative overflow-hidden ink-panel rounded-3xl p-5" aria-label={tr('Latest signal')}>
          <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Latest signal')}</span>
          {latest ? (
            <div className="mt-3 flex items-start gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full font-mono text-fine font-semibold text-ink-0" style={{ background: latest.color }}>
                {latest.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-body font-medium text-bone">{latest.name}</b>
                  <span className={clsx('rounded-full px-2 py-px font-mono text-[0.68rem]', latestTone.text, latestTone.bg)}>{latest.action}</span>
                  <time className="ml-auto font-mono text-[0.68rem] text-bone-faint">{latest.time}</time>
                </div>
                <p className="mt-1 line-clamp-2 text-fine leading-relaxed text-bone-dim">{latest.text}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-fine text-bone-dim">
              <BrainCircuit size={16} aria-hidden="true" /> {tr('Waiting for the first signal from the floor.')}
            </p>
          )}
        </section>

        <section className="flex items-center gap-4 rounded-3xl border border-line bg-ink-1 p-5 max-md:hidden">
          <Ring value={events.length} max={spacehankConfig.maxEvents} />
          <div className="leading-tight">
            <h2 className="font-display text-lead text-bone">{tr('Memory')}</h2>
            <p className="mt-1 text-fine text-bone-dim">{tr('Newest')} {spacehankConfig.maxEvents} {tr('signals kept.')}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-ink-1 p-5">
          <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Who is talking')}</span>
          {agents.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {agents.slice(0, 6).map((a) => (
                <li key={a.name} className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pr-2.5 pl-0.5 text-[0.78rem] text-bone-dim">
                  <span className="grid size-5 place-items-center rounded-full font-mono text-[0.62rem] font-semibold text-ink-0" style={{ background: a.color }}>
                    {a.name.slice(0, 1)}
                  </span>
                  {a.name}
                  <b className="font-mono text-[0.68rem] font-medium text-bone tabular-nums">{a.count}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 font-mono text-fine text-bone-faint">{tr('Nobody yet.')}</p>
          )}
        </section>
      </div>

      {/* the timeline: a panel of its own height, so the page never grows with the stream */}
      <section className="flex flex-col overflow-hidden rounded-3xl border border-line bg-ink-1" aria-label={tr('Recent signals')}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="relative min-w-44 flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bone-faint" aria-hidden="true" />
            <input aria-label={tr('Search the stream')} placeholder={tr('Search signals…')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-full rounded-full border border-line bg-ink-2 pr-4 pl-10 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!agent} onClick={() => setAgent('')} className={clsx('rounded-full px-3 py-1 font-mono text-[0.72rem] transition-colors', !agent ? 'bg-bone text-ink-0' : 'bg-wash/8 text-bone-dim hover:text-bone')}>
              {tr('Everyone')}
            </button>
            {agents.map((a) => (
              <button
                key={a.name}
                type="button"
                aria-pressed={agent === a.name}
                onClick={() => setAgent(agent === a.name ? '' : a.name)}
                className={clsx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.72rem] transition-colors', agent === a.name ? 'border-transparent text-ink-0' : 'border-line text-bone-dim hover:border-line-strong')}
                style={agent === a.name ? { background: a.color } : undefined}
              >
                <i className="size-2 rounded-full" style={{ background: a.color }} aria-hidden="true" /> {a.name}
              </button>
            ))}
          </div>
          <span className="ml-auto font-mono text-[0.68rem] text-bone-faint">
            {groups.length} {tr('rows ·')} {shown.length} {tr('signals')}
          </span>
        </div>

        {groups.length ? (
          <ol className="max-h-[min(52vh,460px)] overflow-y-auto p-2" aria-label={tr('Signals')}>
            {groups.map((group, index) => {
              const key = `${group.name}-${group.action}-${index}`;
              return <Row key={key} group={group} open={openKey === key} onToggle={() => setOpenKey(openKey === key ? null : key)} />;
            })}
          </ol>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-ink-2 text-bone-faint">
              <BrainCircuit size={22} aria-hidden="true" />
            </span>
            <h2 className="font-display text-lead text-bone">{events.length ? tr('No signal matches') : tr('No realtime events yet')}</h2>
            <p className="max-w-xs text-fine text-bone-dim">{events.length ? tr('Try other words, or show everyone.') : tr('Signals from the agent floor appear here as they happen.')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
