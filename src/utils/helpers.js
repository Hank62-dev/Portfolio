export const clsx = (...classes) =>
  classes.filter(Boolean).join(' ');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const truncate = (str, n) =>
  str.length > n ? str.slice(0, n) + '...' : str;

export const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
