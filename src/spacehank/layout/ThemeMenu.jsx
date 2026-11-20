import { Moon, Palette, SunMedium, SunMoon, Volume2, VolumeX } from 'lucide-react';
import { Menu } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { useTheme } from '../../shared/lib/theme';
import { tr } from '../core/i18n/lang';
import { sound, soundState } from '../core/sound';
import { useStore } from '../core/store';
import { openPalettes } from './PalettePicker';
import { paletteOf, paletteState } from '../core/palettes';

/** The three ways to choose the look: light, dark, or auto (light by day, dark by night, following the clock). */
export const THEME_CHOICES = [
  { id: 'light', label: tr('Light'), icon: SunMedium },
  { id: 'dark', label: tr('Dark'), icon: Moon },
  { id: 'auto', label: tr('Auto · by the time of day'), short: 'Auto', icon: SunMoon },
];

/** The top bar's button: shows what is on now (with a small "A" while auto drives it) and opens the three choices. */
export function ThemeMenu() {
  const { theme, mode, setMode } = useTheme();
  const soundOn = useStore(soundState, (s) => s.on);
  const palette = useStore(paletteState, (s) => s.id);
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
      items={[
        ...THEME_CHOICES.map(({ id, label, icon }) => ({ id, label, icon, selected: mode === id, onSelect: () => setMode(id) })),
        // the workspace's small sounds (ticks, a chime when something is done), off until chosen
        { id: 'sound', label: soundOn ? tr('Sounds: on') : tr('Sounds: off'), icon: soundOn ? Volume2 : VolumeX, selected: soundOn, onSelect: () => sound.set(!soundOn) },
        { id: 'palette', label: tr('Colour theme: {0}', paletteOf(palette).name), icon: Palette, onSelect: openPalettes },
      ]}
    />
  );
}

/** The same three choices as a row of pills, for the phone's "More" sheet (and the sounds' switch after them). */
export function ThemePills({ className }) {
  const { mode, setMode } = useTheme();
  const soundOn = useStore(soundState, (s) => s.on);
  return (
    <div className={clsx('flex flex-wrap gap-2', className)} data-theme-pills>
      <div className="contents" role="radiogroup" aria-label={tr('Theme')}>
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
      <button
        type="button"
        aria-pressed={soundOn}
        onClick={() => sound.set(!soundOn)}
        className={clsx('inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-fine transition-colors', soundOn ? 'border-signal/60 bg-signal-soft text-bone' : 'border-line text-bone-dim')}
      >
        {soundOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />} {tr('Sounds')}
      </button>
      <button type="button" onClick={openPalettes} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim">
        <Palette size={15} aria-hidden="true" /> {tr('Colour themes')}
      </button>
    </div>
  );
}
