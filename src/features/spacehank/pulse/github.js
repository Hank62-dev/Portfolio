// Dev Pulse's data: GitHub's public API (it allows browser requests), and a simple reachability check for the services.

import { GITHUB_USERNAME } from '../../../data/profile';

const API = 'https://api.github.com';
const CACHE_KEY = 'hank62.pulse.github';
const CACHE_MS = 10 * 60 * 1000;

/** "3 hours ago", "yesterday"… for an ISO time. */
export const timeAgo = (iso, now = Date.now()) => {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** How a GitHub Actions run reads: ok, danger (failed), warn (running) or neutral. */
export const runTone = (run) => {
  if (!run) return { tone: 'neutral', label: 'No runs' };
  if (run.status !== 'completed') return { tone: 'warn', label: 'Running' };
  if (run.conclusion === 'success') return { tone: 'ok', label: 'Passing' };
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return { tone: 'danger', label: 'Failing' };
  return { tone: 'neutral', label: run.conclusion ?? 'Done' };
};

/** How a service check reads: reachable and quick, reachable but slow, or down. */
export const healthTone = ({ ok, ms }) => {
  if (!ok) return { tone: 'danger', label: 'Down' };
  return ms > 1500 ? { tone: 'warn', label: 'Slow' } : { tone: 'ok', label: 'Healthy' };
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
  if (response.status === 403 || response.status === 429) throw new Error('GitHub is limiting requests for now (60 an hour without a token). Try again later.');
  if (!response.ok) throw new Error(`GitHub answered ${response.status}.`);
  return response.json();
};

const slim = (repo) => ({
  name: repo.name,
  url: repo.html_url,
  description: repo.description ?? '',
  language: repo.language ?? '',
  stars: repo.stargazers_count ?? 0,
  issues: repo.open_issues_count ?? 0,
  pushed: repo.pushed_at,
  fork: Boolean(repo.fork),
});

/**
 * The newest repositories with their latest commits and the status of their latest workflow run. One call for the
 * list and two per repository, cached for ten minutes, to stay inside GitHub's allowance for anonymous requests.
 */
export const loadGithub = async ({ user = GITHUB_USERNAME, limit = 4, fetchImpl = fetch, storage = globalThis.sessionStorage, now = Date.now } = {}) => {
  try {
    const cached = JSON.parse(storage?.getItem(CACHE_KEY) ?? 'null');
    if (cached && cached.user === user && now() - cached.at < CACHE_MS) return cached.data;
  } catch {
    /* an unreadable cache is simply ignored */
  }
  const repos = (await get(`/users/${user}/repos?sort=pushed&per_page=12`, fetchImpl)).filter((r) => !r.fork).slice(0, limit).map(slim);
  const data = await Promise.all(
    repos.map(async (repo) => {
      const [commits, runs] = await Promise.all([
        get(`/repos/${user}/${repo.name}/commits?per_page=3`, fetchImpl).catch(() => []),
        get(`/repos/${user}/${repo.name}/actions/runs?per_page=1`, fetchImpl).catch(() => ({ workflow_runs: [] })),
      ]);
      return {
        ...repo,
        commits: commits.map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0], at: c.commit.author.date, url: c.html_url })),
        run: runs.workflow_runs?.[0] ? { status: runs.workflow_runs[0].status, conclusion: runs.workflow_runs[0].conclusion, url: runs.workflow_runs[0].html_url } : null,
      };
    })
  );
  try {
    storage?.setItem(CACHE_KEY, JSON.stringify({ user, at: now(), data }));
  } catch {
    /* storage is blocked: it is simply fetched again next time */
  }
  return data;
};
