// The few words the shared components say themselves ("Close", "Loading"), in the language the site and the workspace share
// (`lang` in localStorage). A table this small is read on the spot, so the portfolio's pages do not carry the whole
// workspace's translations just to have a Close button.

import { addTexts, i18n } from '../i18n/i18n';
import { storedLang } from '../i18n/language';

const vi = {
  Today: 'Hôm nay',
  Clear: 'Xoá',
  Close: 'Đóng',
  Loading: 'Đang tải',
  Dismiss: 'Bỏ qua',
  'Pick a date': 'Chọn ngày',
  'Something went wrong': 'Đã có lỗi xảy ra',
};

// the "shared" namespace of the app's one i18next; English is the text itself
addTexts('shared', { en: {}, vi });

const isVietnamese = () => storedLang() === 'vi';

/** A word of the shared components, in the current language (read each time, as the choice can change in place). */
export const word = (text) => i18n.getFixedT(storedLang(), 'shared')(text);

/** The locale for dates. */
export const dateLocale = () => (isVietnamese() ? 'vi-VN' : undefined);
