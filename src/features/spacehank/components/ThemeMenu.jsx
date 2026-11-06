import { Moon, SunMedium, SunMoon } from 'lucide-react';
import { Menu } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useTheme } from '../../../lib/theme';
import { tr } from '../lang';

/** The three ways to choose the look: light, dark, or auto (light by day, dark by night, following the clock). */
export const THEME_CHOICES = [
  { id: 'light', label: tr('Light'), icon: SunMedium },
  { id: 'dark', label: tr('Dark'), icon: Moon },
  { id: 'auto', label: tr('Auto · by the time of day'), short: 'Auto', icon: SunMoon },
];

/** The top bar's button: shows what is on now (with a small "A" while auto drives it) and opens the three choices. */
export function ThemeMenu() {
  const { theme, mode, setMode } = useTheme();
  const Icon = theme === 'dark' ? Moon : SunMedium;
  return (
    <Menu
      align="end"
      trigger={
        // a plain button: the menu needs to measure it, and the design-system Button does not pass a ref along
        <button type="button" aria-label={tr('Theme: {0}', mode === 'auto' ? tr('auto, now {0}', theme) : theme)} className="relative grid size-9 shrink-0 place-items-center rounded-full border border-line bg-ink-3 text-bone transition-[border-color,scale] hover:border-line-strong active:scale-95" data-theme-toggle>
          <Icon size={16} aria-hidden="true" />
          {mode === 'auto' && <i className="absolute -right-0.5 -bottom-0.5 grid size-3.5 place-items-center rounded-full bg-signal font-mono text-[0.5rem] leading-none font-bold text-ink-0 not-italic">{tr('A')}</i>}
        </button>
      }
      items={THEME_CHOICES.map(({ id, label, icon }) => ({ id, label, icon, selected: mode === id, onSelect: () => setMode(id) }))}
    />
  );
}

/** The same three choices as a row of pills, for the phone's "More" sheet. */
export function ThemePills({ className }) {
  const { mode, setMode } = useTheme();
  return (
    <div className={clsx('flex flex-wrap gap-2', className)} role="radiogroup" aria-label={tr('Theme')} data-theme-pills>
      {THEME_CHOICES.map(({ id, label, short, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          onClick={() => setMode(id)}
          className={clsx('inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-fine transition-colors', mode === id ? 'border-signal/60 bg-signal-soft text-bone' : 'border-line text-bone-dim')}
        >
          <Icon size={15} aria-hidden="true" /> {short ?? label}
        </button>
      ))}
    </div>
  );
}
