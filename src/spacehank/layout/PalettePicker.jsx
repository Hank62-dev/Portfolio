import { Check } from 'lucide-react';
import { Dialog } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { useTheme } from '../../shared/lib/theme';
import { PALETTES, paletteState, setPalette, tokensOf } from '../core/palettes';
import { createStore, useStore } from '../core/store';
import { tr } from '../core/i18n/lang';
import { WallpaperCanvas } from '../features/wallpaper/Wallpaper';
import { NONE, SCENES } from '../features/wallpaper/scenes';
import { setWallpaper, wallpaperState } from '../features/wallpaper/store';

/** Whether the colour-theme picker is open (the theme menu, the phone's "More" sheet and the command palette open it). */
export const paletteUi = createStore({ open: false });
export const openPalettes = () => paletteUi.set({ open: true });

const hsl = ([h, s, l]) => `hsl(${h} ${s}% ${l}%)`;

/** A palette as a little card: its own four colours as a strip, and a page in it (in the theme now on) with a line of text and the accent. */
function PaletteCard({ palette, chosen, theme }) {
  const look = palette.dark ? tokensOf(palette, theme) : null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      onClick={() => setPalette(palette.id)}
      className={clsx('group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-[border-color,transform] active:scale-[0.98]', chosen ? 'border-signal' : 'border-line hover:border-line-strong')}
      data-palette-card={palette.id}
    >
      <span className="flex h-3" aria-hidden="true">
        {palette.swatch.map((c) => (
          <i key={c} className="flex-1" style={{ background: c }} />
        ))}
      </span>
      <span className="flex flex-col gap-1.5 p-3" style={look ? { background: hsl(look.surfaces[1]) } : undefined}>
        <span className="flex items-center gap-2">
          <b className="min-w-0 flex-1 truncate text-fine font-medium" style={look ? { color: hsl(look.bone) } : undefined}>
            {palette.name}
          </b>
          {chosen && (
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-signal text-ink-0" style={look ? { background: hsl(look.signal), color: hsl(look.surfaces[0]) } : undefined}>
              <Check size={12} strokeWidth={3} aria-hidden="true" />
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <i className="h-1.5 w-10 rounded-full" style={{ background: look ? hsl(look.signal) : 'var(--color-signal)' }} />
          <i className="h-1.5 w-6 rounded-full" style={{ background: look ? hsl(look.dim) : 'var(--color-bone-dim)', opacity: 0.6 }} />
          <i className="h-1.5 w-4 rounded-full" style={{ background: look ? hsl(look.surfaces[3]) : 'var(--color-ink-3)' }} />
        </span>
      </span>
    </button>
  );
}

/** A live wallpaper as a little window onto it (a still frame of the scene, drawn small), with its name under it. */
function WallpaperCard({ id, name, chosen, theme }) {
  return (
    <button type="button" role="radio" aria-checked={chosen} onClick={() => setWallpaper(id)} className="group flex flex-col gap-1.5 text-left" data-wallpaper-card={id}>
      <span className={clsx('relative block aspect-[16/10] overflow-hidden rounded-xl border-2 transition-[border-color,transform] group-active:scale-[0.97]', chosen ? 'border-signal' : 'border-line group-hover:border-line-strong')}>
        {id === NONE ? <span className="grid size-full place-items-center bg-ink-2 font-mono text-[0.7rem] text-bone-faint">{tr('Off')}</span> : <WallpaperCanvas id={id} theme={theme} still cell={5} />}
      </span>
      <span className="flex items-center gap-1 truncate text-[0.74rem] text-bone-dim">
        {name}
        {chosen && <Check size={12} className="shrink-0 text-signal" aria-hidden="true" />}
      </span>
    </button>
  );
}

/**
 * The look of the workspace, to choose from: a live wallpaper behind it (scenes typed in characters that move all the time),
 * and a colour palette (every tab its own colour, the default, or one palette for the whole workspace).
 */
export default function PalettePicker() {
  const open = useStore(paletteUi, (s) => s.open);
  const chosen = useStore(paletteState, (s) => s.id);
  const paper = useStore(wallpaperState, (s) => s.id);
  const { theme } = useTheme();
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => paletteUi.set({ open: value })}
      eyebrow={tr('Appearance')}
      title={tr('Themes')}
      description={tr('A live wallpaper behind the workspace, and a palette for its colours. Light, dark or auto stays your choice.')}
      contentProps={{ 'data-wide-dialog': '' }}
    >
      <section className="flex flex-col gap-2.5">
        <h3 className="font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Live wallpapers')}</h3>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5" role="radiogroup" aria-label={tr('Live wallpapers')}>
          <WallpaperCard id={NONE} name={tr('None')} chosen={paper === NONE} theme={theme} />
          {SCENES.map((scene) => (
            <WallpaperCard key={scene.id} id={scene.id} name={scene.name} chosen={paper === scene.id} theme={theme} />
          ))}
        </div>
      </section>
      <h3 className="font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Colour palettes')}</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label={tr('Colour themes')}>
        {PALETTES.map((palette) => (
          <PaletteCard key={palette.id} palette={palette} chosen={chosen === palette.id} theme={theme} />
        ))}
      </div>
      <p className="font-mono text-[0.68rem] text-bone-faint">{tr('The palettes come from the theme examples of Anthropic’s theme-factory skill.')}</p>
    </Dialog>
  );
}
