// The few words the shared components say themselves ("Close", "Loading"), in the language the site and the workspace share
// (`lang` in localStorage). A table this small is read on the spot, so the portfolio's pages do not carry the whole
// workspace's translations just to have a Close button.

const vi = {
  Today: 'Hôm nay',
  Clear: 'Xoá',
  Close: 'Đóng',
  Loading: 'Đang tải',
  Dismiss: 'Bỏ qua',
  'Pick a date': 'Chọn ngày',
  'Something went wrong': 'Đã có lỗi xảy ra',
};

const isVietnamese = () => {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'vi' || saved === 'en') return saved === 'vi';
  } catch {
    /* storage is blocked: use the browser's language */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi');
};

/** A word of the shared components, in the current language. */
export const word = (text) => (isVietnamese() ? vi[text] ?? text : text);

/** The locale for dates. */
export const dateLocale = () => (isVietnamese() ? 'vi-VN' : undefined);
