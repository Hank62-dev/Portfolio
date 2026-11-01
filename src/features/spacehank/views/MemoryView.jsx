import { useMemo, useState } from 'react';
import { BrainCircuit, ChevronDown, Search } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { spacehankConfig } from '../config';
import { groupRuns } from '../model/memory';

// the tone of an event, from what the agent did
const TONE = {
  started: { text: 'text-warn', bg: 'bg-warn/12' },
  output: { text: 'text-bone-dim', bg: 'bg-white/8' },
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
    <div className="relative grid size-20 shrink-0 place-items-center" role="img" aria-label={`${value} of ${max} signals kept`}>
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="url(#mem)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
        <defs>
          <linearGradient id="mem" x1="0" x2="1">
            <stop offset="0" stopColor="#ff5b2e" />
            <stop offset="1" stopColor="#8a3bff" />
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
    <li className="rounded-xl transition-colors hover:bg-white/[0.04]" data-signal>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-2.5 py-2 text-left">
        <span className="grid size-7 shrink-0 place-items-center rounded-full font-mono text-[0.7rem] font-semibold text-ink-0" style={{ background: group.color }}>
          {group.name.slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <b className="shrink-0 text-fine font-medium text-bone">{group.name}</b>
          <span className={clsx('shrink-0 rounded-full px-2 py-px font-mono text-[0.68rem]', tone.text, tone.bg)}>{group.action}</span>
          {many && <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-px font-mono text-[0.68rem] text-bone-dim tabular-nums">×{group.items.length}</span>}
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
  const [openKey, setOpenKey] = useState(null);

  const agents = useMemo(() => {
    const map = new Map();
    for (const e of events) map.set(e.name, { name: e.name, color: e.color, count: (map.get(e.name)?.count ?? 0) + 1 });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [events]);

  const shown = useMemo(
    () => events.filter((e) => (!agent || e.name === agent) && (!query.trim() || `${e.name} ${e.action} ${e.text}`.toLowerCase().includes(query.toLowerCase()))),
    [events, agent, query]
  );
  const groups = useMemo(() => groupRuns(shown), [shown]);
  const latest = events[0];
  const latestTone = latest ? toneOf(latest.action) : TONE.output;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">Long-term context</span>
          <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone">
            Memory <em className="serif-accent">Stream.</em>
          </h1>
        </div>
        <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[0.78rem]', events.length ? 'border-ok/40 text-ok' : 'border-warn/40 text-warn')}>
          <i className={clsx('size-1.5 rounded-full', events.length ? 'animate-pulse bg-ok' : 'bg-warn')} aria-hidden="true" /> {events.length ? 'Synced' : 'Waiting'}
        </span>
      </header>

      {/* the glance: the newest signal, how full the memory is, and who has been talking */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(80%_120%_at_0%_0%,rgb(255_91_46/0.12),transparent_60%),var(--color-ink-1)] p-5" aria-label="Latest signal">
          <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Latest signal</span>
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
              <BrainCircuit size={16} aria-hidden="true" /> Waiting for the first signal from the floor.
            </p>
          )}
        </section>

        <section className="flex items-center gap-4 rounded-3xl border border-line bg-ink-1 p-5">
          <Ring value={events.length} max={spacehankConfig.maxEvents} />
          <div className="leading-tight">
            <h2 className="font-display text-lead text-bone">Memory</h2>
            <p className="mt-1 text-fine text-bone-dim">Newest {spacehankConfig.maxEvents} signals kept.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-ink-1 p-5">
          <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Who is talking</span>
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
            <p className="mt-3 font-mono text-fine text-bone-faint">Nobody yet.</p>
          )}
        </section>
      </div>

      {/* the timeline: a panel of its own height, so the page never grows with the stream */}
      <section className="flex flex-col overflow-hidden rounded-3xl border border-line bg-ink-1" aria-label="Recent signals">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="relative min-w-44 flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bone-faint" aria-hidden="true" />
            <input aria-label="Search the stream" placeholder="Search signals…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-full rounded-full border border-line bg-ink-2 pr-4 pl-10 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!agent} onClick={() => setAgent('')} className={clsx('rounded-full px-3 py-1 font-mono text-[0.72rem] transition-colors', !agent ? 'bg-bone text-ink-0' : 'bg-white/8 text-bone-dim hover:text-bone')}>
              Everyone
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
            {groups.length} rows · {shown.length} signals
          </span>
        </div>

        {groups.length ? (
          <ol className="max-h-[min(52vh,460px)] overflow-y-auto p-2" aria-label="Signals">
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
            <h2 className="font-display text-lead text-bone">{events.length ? 'No signal matches' : 'No realtime events yet'}</h2>
            <p className="max-w-xs text-fine text-bone-dim">{events.length ? 'Try other words, or show everyone.' : 'Signals from the agent floor appear here as they happen.'}</p>
          </div>
        )}
      </section>
    </div>
  );
}
