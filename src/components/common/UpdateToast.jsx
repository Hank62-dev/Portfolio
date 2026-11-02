import { RefreshCw, X } from 'lucide-react';
import { applyUpdate, later, useUpdate } from '../../lib/appUpdate';

const copy = (vi) =>
  vi
    ? { text: 'Có bản cập nhật mới', update: 'Cập nhật', later: 'Để sau' }
    : { text: 'A new version is ready', update: 'Update', later: 'Later' };

/** A small pill at the top of the screen that appears when a newer version of the site has been downloaded. */
export default function UpdateToast() {
  const { ready, dismissed } = useUpdate();
  if (!ready || dismissed) return null;
  const words = copy(typeof navigator !== 'undefined' && /^vi/i.test(navigator.language ?? ''));
  return (
    <div role="status" aria-live="polite" className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 z-[90] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-fade-in" data-update-toast>
      <div className="flex items-center gap-2.5 rounded-full border border-line-strong bg-ink-1/90 py-1.5 pr-1.5 pl-4 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)] backdrop-blur-2xl">
        <span className="relative grid size-2.5 shrink-0 place-items-center" aria-hidden="true">
          <i className="absolute size-2.5 animate-ping rounded-full bg-signal/60 [animation-duration:2s]" />
          <i className="size-2 rounded-full bg-signal" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-fine text-bone">{words.text}</span>
        <button type="button" onClick={applyUpdate} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-bone px-3.5 font-mono text-[0.78rem] font-medium text-ink-0 transition-transform active:scale-95">
          <RefreshCw size={13} aria-hidden="true" /> {words.update}
        </button>
        <button type="button" onClick={later} aria-label={words.later} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
