import { useLang } from '../../../lib/i18n';
import { clsx } from '../../../lib/format';

const LangToggle = () => {
  const { lang, setLang, c } = useLang();
  return (
    <div
      className="inline-flex overflow-hidden rounded-sm border border-line-strong"
      role="group"
      aria-label={c.nav.language}
    >
      {['en', 'vi'].map((code) => (
        <button
          key={code}
          type="button"
          className={clsx(
            'min-h-[34px] min-w-10 px-2.5 font-mono text-fine transition-colors duration-200',
            lang === code ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone'
          )}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          lang={code}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LangToggle;
