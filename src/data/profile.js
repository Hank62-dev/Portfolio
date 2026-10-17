// Single source of truth for personal facts.
// Every entry is either taken from the GitHub profile/README of Hank62-dev or
// from this site's previous config (email, social links). Nothing else is claimed.

export const GITHUB_USERNAME = 'Hank62-dev';
export const SITE_URL = 'https://portfolio-vgh.vercel.app';

export const profile = {
  name: 'Võ Gia Huy',
  handle: 'Hank',
  portrait: '/images/anhOfHuy.jpg',
  location: { en: 'Ho Chi Minh City, Vietnam', vi: 'TP. Hồ Chí Minh, Việt Nam' },
  school: 'FPT University',
  email: 'huyvog6226@gmail.com',
};

// What the GitHub profile README says about the person (verified, 2026-10).
export const facts = [
  {
    id: 'study',
    label: { en: 'Studying', vi: 'Đang học' },
    value: { en: 'Software Engineering, FPT University', vi: 'Kỹ thuật phần mềm, ĐH FPT' },
  },
  {
    id: 'club',
    label: { en: 'Leading', vi: 'Đảm nhiệm' },
    value: { en: 'Vice President, F-Code Club', vi: 'Phó chủ nhiệm CLB F-Code' },
  },
  {
    id: 'rode',
    label: { en: 'Competed', vi: 'Thi đấu' },
    value: { en: 'Champion, R.ODE Battle 2025', vi: 'Quán quân R.ODE Battle 2025' },
  },
];

export const socials = [
  { id: 'github', label: 'GitHub', url: `https://github.com/${GITHUB_USERNAME}`, handle: `@${GITHUB_USERNAME}` },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/gia-huy-v%C3%B5-a501b6370/',
    handle: 'gia-huy-võ',
  },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@v.gia.huy6226', handle: '@v.gia.huy6226' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/hankhyu.6226/', handle: '@hankhyu.6226' },
];

export const NAV_SECTIONS = ['work', 'stack', 'lab', 'about', 'activity', 'contact'];
