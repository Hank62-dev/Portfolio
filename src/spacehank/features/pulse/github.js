// Dev Pulse's data: GitHub's public API (it allows browser requests), and a simple reachability check for the services.

import { GITHUB_USERNAME } from '../../../shared/profile';
import { locale, tr } from '../../core/i18n/lang';

const API = 'https://api.github.com';
const CACHE_KEY = 'hank62.pulse.github';
const CACHE_MS = 10 * 60 * 1000;

/** "3 hours ago", "yesterday"… for an ISO time. */
export const timeAgo = (iso, now = Date.now()) => {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return tr('{0} min ago', minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return tr('{0} h ago', hours);
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return tr('{0} days ago', days);
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
};

/** How a GitHub Actions run reads: ok, danger (failed), warn (running) or neutral. */
export const runTone = (run) => {
  if (!run) return { tone: 'neutral', label: tr('No runs') };
  if (run.status !== 'completed') return { tone: 'warn', label: tr('Running') };
  if (run.conclusion === 'success') return { tone: 'ok', label: tr('Passing') };
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return { tone: 'danger', label: tr('Failing') };
  return { tone: 'neutral', label: run.conclusion ?? tr('Done') };
};

/** How a service check reads: reachable and quick, reachable but slow, or down. */
export const healthTone = ({ ok, ms }) => {
  if (!ok) return { tone: 'danger', label: tr('Down') };
  return ms > 1500 ? { tone: 'warn', label: tr('Slow') } : { tone: 'ok', label: tr('Healthy') };
};

/** Pings a URL and times it. `cors: false` only learns whether the server answered at all (an opaque response). */
export const ping = async (url, { cors = true, fetchImpl = fetch, timeout = 8000, now = () => performance.now() } = {}) => {
  const start = now();
  try {
    const response = await fetchImpl(url, { mode: cors ? 'cors' : 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    return { ok: cors ? response.ok : true, ms: Math.round(now() - start), status: cors ? response.status : null };
  } catch {
    return { ok: false, ms: Math.round(now() - start), status: null };
  }
};

const get = async (path, fetchImpl) => {
  const response = await fetchImpl(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json' } });
  if (response.status === 403 || response.status === 429) throw new Error(tr('GitHub is limiting requests for now (60 an hour without a token). Try again later.'));
  if (!response.ok) throw new Error(tr('GitHub answered {0}.', response.status));
  return response.json();
};

const slim = (repo) => ({
  name: repo.name,
  full: repo.full_name ?? repo.name,
  url: repo.html_url,
  description: repo.description ?? '',
  language: repo.language ?? '',
  stars: repo.stargazers_count ?? 0,
  issues: repo.open_issues_count ?? 0,
  pushed: repo.pushed_at,
  fork: Boolean(repo.fork),
});

// starring or forking someone's repository is not working on it
const PASSIVE = new Set(['WatchEvent', 'ForkEvent']);

/** The repositories the person last worked on (pushes, pull requests, reviews, issues…), newest first, each once, with when. */
export const activeRepos = (events) => {
  const seen = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const full = event?.repo?.name;
    if (!full || PASSIVE.has(event.type) || seen.has(full)) continue;
    seen.set(full, event.created_at);
  }
  return [...seen].map(([full, at]) => ({ full, at }));
};

const CACHE_VERSION = 2;

/**
 * The repositories the person was most recently active in, their own or anyone's (from their public events), filled up
 * with their newest own repositories when there were fewer; each with the person's latest commits there and the status
 * of its latest workflow run. Cached for ten minutes, to stay inside GitHub's allowance for anonymous requests.
 */
export const loadGithub = async ({ user = GITHUB_USERNAME, limit = 4, fetchImpl = fetch, storage = globalThis.sessionStorage, now = Date.now } = {}) => {
  try {
    const cached = JSON.parse(storage?.getItem(CACHE_KEY) ?? 'null');
    if (cached && cached.v === CACHE_VERSION && cached.user === user && now() - cached.at < CACHE_MS) return cached.data;
  } catch {
    /* an unreadable cache is simply ignored */
  }
  const mine = (full) => full.split('/')[0].toLowerCase() === user.toLowerCase();
  const active = activeRepos(await get(`/users/${user}/events/public?per_page=100`, fetchImpl).catch(() => [])).slice(0, limit);
  const details = await Promise.all(active.map(({ full }) => get(`/repos/${full}`, fetchImpl).then(slim).catch(() => null)));
  let repos = active.map((a, i) => details[i] && { ...details[i], active: a.at }).filter(Boolean);
  if (repos.length < limit) {
    const taken = new Set(repos.map((r) => r.full.toLowerCase()));
    const own = (await get(`/users/${user}/repos?sort=pushed&per_page=12`, fetchImpl)).filter((r) => !r.fork).map(slim);
    repos = [...repos, ...own.filter((r) => !taken.has(`${user}/${r.name}`.toLowerCase()) && !taken.has(r.full.toLowerCase()))].slice(0, limit);
  }
  const data = await Promise.all(
    repos.map(async (repo) => {
      const full = repo.full.includes('/') ? repo.full : `${user}/${repo.name}`;
      const [commits, runs] = await Promise.all([
        get(`/repos/${full}/commits?per_page=3${mine(full) ? '' : `&author=${encodeURIComponent(user)}`}`, fetchImpl).catch(() => []),
        get(`/repos/${full}/actions/runs?per_page=1`, fetchImpl).catch(() => ({ workflow_runs: [] })),
      ]);
      return {
        ...repo,
        full,
        own: mine(full),
        pushed: repo.active ?? repo.pushed,
        commits: commits.map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0], at: c.commit.author.date, url: c.html_url })),
        run: runs.workflow_runs?.[0] ? { status: runs.workflow_runs[0].status, conclusion: runs.workflow_runs[0].conclusion, url: runs.workflow_runs[0].html_url } : null,
      };
    })
  );
  try {
    storage?.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, user, at: now(), data }));
  } catch {
    /* storage is blocked: it is simply fetched again next time */
  }
  return data;
};
