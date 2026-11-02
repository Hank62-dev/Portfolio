import { useCallback, useEffect, useRef, useState } from 'react';
import { BrainCircuit, CircleDot, ExternalLink, GitBranch, GitCommitHorizontal, Globe, RefreshCw, Server, Star } from 'lucide-react';
import { Badge, Button, Skeleton } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { SITE_URL, GITHUB_USERNAME } from '../../../data/profile';
import { aiUsage } from '../api/owner';
import { Figure, PageHead, Tile } from '../components/Page';
import { spacehankConfig } from '../config';
import { healthTone, loadGithub, ping, runTone, timeAgo } from '../pulse/github';

const TONE_TEXT = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger', neutral: 'text-bone-faint' };
const TONE_DOT = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger', neutral: 'bg-bone-faint' };

const SERVICE_ICON = { site: Globe, realtime: Server, rag: BrainCircuit };

const SERVICES = [
  { id: 'site', name: 'Portfolio', note: 'Vercel', url: SITE_URL, cors: false },
  { id: 'realtime', name: 'Realtime server', note: 'Render', url: `${spacehankConfig.realtimeApiUrl}/health`, cors: true },
  { id: 'rag', name: 'Hank RAG', note: 'Render', url: `${spacehankConfig.ragApiUrl}/health`, cors: true },
];

/** The last few response times as slim bars. A failed check is a red stub. */
function Trace({ history }) {
  const slowest = Math.max(400, ...history.map((h) => h.ms));
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {history.map((h, i) => (
        <i key={i} className={clsx('block w-1.5 rounded-sm', h.ok ? (h.ms > 1500 ? 'bg-warn' : 'bg-ok/70') : 'bg-danger')} style={{ height: h.ok ? `${Math.max(12, (h.ms / slowest) * 100)}%` : '100%', opacity: h.ok ? 1 : 0.6 }} />
      ))}
    </div>
  );
}

export default function PulseView({ owner }) {
  const [checks, setChecks] = useState({});
  const [repos, setRepos] = useState(null);
  const [problem, setProblem] = useState('');
  const [usage, setUsage] = useState(null);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const history = useRef({});

  const refresh = useCallback(async () => {
    setBusy(true);
    const results = await Promise.all(SERVICES.map(async (s) => [s.id, await ping(s.url, { cors: s.cors })]));
    const next = {};
    for (const [id, result] of results) {
      history.current[id] = [...(history.current[id] ?? []), result].slice(-24);
      next[id] = result;
    }
    setChecks(next);
    setAt(Date.now());
    if (owner) aiUsage().then(setUsage).catch(() => setUsage(null));
    setBusy(false);
  }, [owner]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    let live = true;
    loadGithub()
      .then((data) => live && setRepos(data))
      .catch((error) => live && (setProblem(error.message), setRepos([])));
    return () => {
      live = false;
    };
  }, []);

  const states = SERVICES.map((s) => (checks[s.id] ? healthTone(checks[s.id]) : null));
  const down = states.filter((s) => s?.tone === 'danger').length;
  const slow = states.filter((s) => s?.tone === 'warn').length;
  const failing = (repos ?? []).filter((r) => runTone(r.run).tone === 'danger').length;
  const issues = down + failing;

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Build" title="Dev" accent="Pulse." description="Is everything up, and what has been happening in your repositories? Checked from your browser, nothing stored.">
        <Button variant="ghost" size="sm" loading={busy} onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" /> Check now
        </Button>
      </PageHead>

      <div className={clsx('flex flex-wrap items-center gap-4 rounded-3xl border p-5', !at ? 'border-line bg-ink-1' : issues ? 'border-danger/40 bg-danger/8' : slow ? 'border-warn/40 bg-warn/8' : 'border-ok/35 bg-ok/8')} role="status" data-overall>
        <span className={clsx('size-3 shrink-0 rounded-full', !at ? 'animate-pulse bg-bone-faint' : issues ? 'bg-danger' : slow ? 'bg-warn' : 'bg-ok shadow-[0_0_14px_2px_rgb(127_214_162/0.6)]')} aria-hidden="true" />
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="font-display text-h3 text-bone">{!at ? 'Checking…' : issues ? `${issues} thing${issues > 1 ? 's need' : ' needs'} attention` : slow ? 'Up, but something is slow' : 'All systems healthy'}</h2>
          <p className="font-mono text-[0.72rem] text-bone-faint">{at ? `Checked ${timeAgo(new Date(at).toISOString())}. Refreshes every minute.` : 'Pinging the services…'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SERVICES.map((s, i) => {
          const state = states[i];
          const check = checks[s.id];
          return (
            <Tile key={s.id} data-service={s.id}>
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-bone-dim">
                  {(() => {
                    const Icon = SERVICE_ICON[s.id];
                    return <Icon size={16} aria-hidden="true" />;
                  })()}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <h3 className="truncate text-fine font-medium text-bone">{s.name}</h3>
                  <small className="font-mono text-[0.68rem] text-bone-faint">{s.note}</small>
                </div>
                {state ? (
                  <span className={clsx('inline-flex items-center gap-1.5 font-mono text-[0.72rem]', TONE_TEXT[state.tone])}>
                    <i className={clsx('size-2 rounded-full', TONE_DOT[state.tone])} aria-hidden="true" /> {state.label}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-16" />
                )}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <b className="font-display text-h3 leading-none text-bone tabular-nums">{check ? (check.ok ? `${check.ms}` : '—') : ' '}<small className="pl-1 font-mono text-[0.68rem] font-normal text-bone-faint">{check?.ok ? 'ms' : ''}</small></b>
                <Trace history={history.current[s.id] ?? []} />
              </div>
              {check && !check.ok && s.id !== 'site' && <p className="mt-2 font-mono text-[0.68rem] text-bone-faint">Render's free plan sleeps when idle; the first request can take a minute.</p>}
            </Tile>
          );
        })}
      </div>

      {owner && usage && (
        <div className="grid grid-cols-3 gap-3">
          <Figure value={`${usage.used}/${usage.limit}`} label="AI calls today" tone={usage.used >= usage.limit ? 'text-danger' : 'text-bone'} />
          <Figure value={usage.text ? 'On' : 'Off'} label="Text AI" tone={usage.text ? 'text-ok' : 'text-bone-faint'} />
          <Figure value={usage.image ?? 'Off'} label="Image provider" />
        </div>
      )}

      <section aria-label="Repositories" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lead text-bone">Repositories</h2>
          <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[0.72rem] text-bone-faint hover:text-bone">
            @{GITHUB_USERNAME} <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
        {problem && <p className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 font-mono text-fine text-warn">{problem}</p>}
        {repos === null ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {repos.map((r) => {
              const run = runTone(r.run);
              return (
                <Tile key={r.name} data-repo={r.name}>
                  <div className="flex items-start gap-3">
                    <GitBranch size={18} className="mt-0.5 shrink-0 text-bone-faint" aria-hidden="true" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <h3 className="truncate text-body font-medium text-bone">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-signal">
                          {r.name}
                        </a>
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-fine text-bone-dim">{r.description || 'No description'}</p>
                    </div>
                    <span className={clsx('inline-flex shrink-0 items-center gap-1.5 font-mono text-[0.72rem]', TONE_TEXT[run.tone])}>
                      <i className={clsx('size-2 rounded-full', TONE_DOT[run.tone])} aria-hidden="true" /> {run.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[0.68rem] text-bone-faint">
                    {r.language && <Badge>{r.language}</Badge>}
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} aria-hidden="true" /> {r.stars}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CircleDot size={11} aria-hidden="true" /> {r.issues}
                    </span>
                    <span className="ml-auto">pushed {timeAgo(r.pushed)}</span>
                  </div>
                  {r.commits.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                      {r.commits.map((c) => (
                        <li key={c.sha} className="flex items-center gap-2.5 text-fine">
                          <GitCommitHorizontal size={13} className="shrink-0 text-bone-faint" aria-hidden="true" />
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-bone-dim hover:text-bone">
                            {c.message}
                          </a>
                          <time className="shrink-0 font-mono text-[0.64rem] text-bone-faint">{timeAgo(c.at)}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </Tile>
              );
            })}
            {!repos.length && !problem && <p className="font-mono text-fine text-bone-faint">No public repositories found.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
