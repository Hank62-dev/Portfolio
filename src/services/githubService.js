const GITHUB_USERNAME = 'Hank62-dev';
const BASE = 'https://api.github.com';
const CONTRIBUTIONS_URL = 'https://github-contributions-api.jogruber.de/v4';

export const fetchGithubRepos = async () => {
  const res = await fetch(`${BASE}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=10`);
  if (!res.ok) throw new Error('Failed to fetch GitHub repos');
  return res.json();
};

export const fetchGithubStats = async () => {
  const res = await fetch(`${BASE}/users/${GITHUB_USERNAME}`);
  if (!res.ok) throw new Error('Failed to fetch GitHub stats');
  return res.json();
};

export const fetchGithubContributions = async () => {
  const res = await fetch(`${CONTRIBUTIONS_URL}/${GITHUB_USERNAME}?t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch GitHub contributions');
  return res.json();
};
