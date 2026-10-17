import { GITHUB_USERNAME } from '../data/profile';

const API = 'https://api.github.com';
const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de/v4';

// Unauthenticated GitHub API calls are limited to 60/hour per IP, so the snapshot is
// cached for an hour and de-duplicated while a request is in flight.
const CACHE_KEY = 'gh-snapshot-v2';
const CACHE_TTL = 60 * 60 * 1000;

let inflight = null;

const readCache = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (raw && Date.now() - raw.fetchedAt < CACHE_TTL) return raw;
  } catch {
    /* storage unavailable or corrupted */
  }
  return null;
};

const writeCache = (snapshot) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
};

const getJson = async (url) => {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const reason = res.status === 403 || res.status === 429 ? 'rate-limited' : `HTTP ${res.status}`;
    throw new Error(`GitHub request failed (${reason})`);
  }
  return res.json();
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// External data is untrusted: keep only the fields we use, with the types we expect.
const normalizeUser = (raw) => {
  if (!raw || typeof raw.login !== 'string') throw new Error('Unexpected GitHub user payload');
  return {
    login: raw.login,
    publicRepos: isNum(raw.public_repos) ? raw.public_repos : null,
    followers: isNum(raw.followers) ? raw.followers : null,
    createdAt: typeof raw.created_at === 'string' ? raw.created_at : null,
    url: typeof raw.html_url === 'string' ? raw.html_url : `https://github.com/${GITHUB_USERNAME}`,
  };
};

const normalizeRepos = (raw) => {
  if (!Array.isArray(raw)) throw new Error('Unexpected GitHub repos payload');
  return raw
    .filter((r) => r && typeof r.name === 'string' && !r.fork && r.name !== GITHUB_USERNAME)
    .map((r) => ({
      name: r.name,
      language: typeof r.language === 'string' ? r.language : null,
      pushedAt: typeof r.pushed_at === 'string' ? r.pushed_at : null,
      url: String(r.html_url ?? ''),
    }));
};

const normalizeContributions = (raw) => {
  if (!raw || !Array.isArray(raw.contributions)) throw new Error('Unexpected contributions payload');
  return raw.contributions
    .filter((d) => d && typeof d.date === 'string' && isNum(d.count))
    .map((d) => ({ date: d.date, count: d.count }));
};

const fetchSnapshot = async () => {
  const [user, repos, contributions] = await Promise.allSettled([
    getJson(`${API}/users/${GITHUB_USERNAME}`).then(normalizeUser),
    getJson(`${API}/users/${GITHUB_USERNAME}/repos?per_page=100&sort=pushed`).then(normalizeRepos),
    getJson(`${CONTRIBUTIONS_API}/${GITHUB_USERNAME}?y=last`).then(normalizeContributions),
  ]);

  // Contributions come from a third-party service; the page still works without them.
  if (user.status === 'rejected' && repos.status === 'rejected') throw user.reason;

  return {
    user: user.status === 'fulfilled' ? user.value : null,
    repos: repos.status === 'fulfilled' ? repos.value : null,
    contributions: contributions.status === 'fulfilled' ? contributions.value : null,
    fetchedAt: Date.now(),
  };
};

export const getGithubSnapshot = ({ force = false } = {}) => {
  if (!force) {
    const cached = readCache();
    if (cached) return Promise.resolve(cached);
    if (inflight) return inflight;
  }
  inflight = fetchSnapshot()
    .then((snapshot) => {
      writeCache(snapshot);
      return snapshot;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};
