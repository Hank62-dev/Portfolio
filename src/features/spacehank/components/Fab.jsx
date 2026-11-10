import { clsx } from '../../../shared/lib/format';
import { fabStore } from '../fab';
import { useStore } from '../store';

/** The screen's main action as a round button above the tab bar (phones only; Workspace decides when to draw it). */
export default function Fab({ raised }) {
  const fab = useStore(fabStore, (s) => s.fab);
  if (!fab) return null;
  const Icon = fab.icon;
  return (
    <button
      type="button"
      key={fab.label}
      aria-label={fab.label}
      onClick={() => {
        navigator.vibrate?.(8);
        fab.onPress();
      }}
      className={clsx(
        'fixed right-4 z-30 grid size-14 animate-fade-in place-items-center rounded-full bg-signal text-ink-0 shadow-[0_14px_30px_-10px_var(--color-signal),0_6px_14px_-6px_rgb(var(--shadow-rgb)/0.7)] transition-transform active:scale-90',
        raised ? 'bottom-[calc(12rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(7.8rem+env(safe-area-inset-bottom))]'
      )}
      data-fab
    >
      <Icon size={24} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
