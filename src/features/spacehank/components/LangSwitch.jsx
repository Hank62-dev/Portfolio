import { Languages } from 'lucide-react';
import { Menu } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { LANGS, getLang, setLang, tr } from '../lang';

const NAMES = { vi: 'Tiếng Việt', en: 'English' };

/** The top bar's language button: shows the language in use (VI or EN) and opens the two choices. */
export function LangMenu() {
  const lang = getLang();
  return (
    <Menu
      align="end"
      trigger={
        // a plain button: the menu needs to measure it
        <button type="button" aria-label={tr('Language: {0}', NAMES[lang])} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink-2 px-3 font-mono text-[0.72rem] text-bone-dim transition-colors hover:text-bone data-[state=open]:border-line-strong data-[state=open]:text-bone" data-lang-menu>
          <Languages size={14} aria-hidden="true" /> {lang.toUpperCase()}
        </button>
      }
      items={LANGS.map((code) => ({ id: code, label: NAMES[code], selected: lang === code, onSelect: () => setLang(code) }))}
    />
  );
}

/** The same two choices as a row of pills, for the phone's "More" sheet. */
export function LangPills({ className }) {
  const lang = getLang();
  return (
    <div className={clsx('flex flex-wrap gap-2', className)} role="radiogroup" aria-label={tr('Language')} data-lang-pills>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          onClick={() => setLang(code)}
          lang={code}
          className={clsx('inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-fine transition-colors', lang === code ? 'border-signal/60 bg-signal-soft text-bone' : 'border-line text-bone-dim')}
        >
          <Languages size={15} aria-hidden="true" /> {NAMES[code]}
        </button>
      ))}
    </div>
  );
}
