export const formatNumber = (n, lang = 'en') => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n);

export const formatDate = (iso, lang = 'en', opts = { month: 'short', day: 'numeric' }) =>
  new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', opts).format(new Date(iso));

// "3 hours ago" style label via Intl.RelativeTimeFormat.
export const timeAgo = (iso, lang = 'en') => {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === 'vi' ? 'vi' : 'en', { numeric: 'auto' });
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(Math.round(diff), 'second');
};

export const clsx = (...parts) => parts.filter(Boolean).join(' ');
