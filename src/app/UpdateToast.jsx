import { useState } from 'react';
import { Bell, ChevronDown, RefreshCw, Sparkles, X } from 'lucide-react';
import { applyUpdate, dismissNews, enableNotices, later, noticePermission, useUpdate } from '../shared/lib/appUpdate';
import { changeText } from '../shared/lib/changelog';

// The page's language: the workspace keeps it under `lang` (the same choice the portfolio makes), else the browser's own.
const vietnamese = () => {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'vi' || saved === 'en') return saved === 'vi';
  } catch {
    /* storage is blocked: the browser's language decides */
  }
  return typeof navigator !== 'undefined' && /^vi/i.test(navigator.language ?? '');
};

const copy = (vi) =>
  vi
    ? { text: 'Có bản cập nhật mới', update: 'Cập nhật', later: 'Để sau', notify: 'Báo cho tôi trên màn hình điện thoại khi có bản mới', news: 'Có gì mới', hide: 'Ẩn', updated: 'Đã cập nhật. Có gì mới:', updatedTo: (v) => `Đã cập nhật lên v${v}. Có gì mới:`, close: 'Đóng' }
    : { text: 'A new version is ready', update: 'Update', later: 'Later', notify: 'Notify me on my phone when there is a new version', news: "What's new", hide: 'Hide', updated: "Updated. What's new:", updatedTo: (v) => `Updated to v${v}. What's new:`, close: 'Close' };

const PANEL = 'rounded-3xl border border-line-strong bg-ink-1/95 p-4 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)] backdrop-blur-2xl';
const HOLDER = 'fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 z-[90] flex w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-fade-in flex-col gap-2';

/** A list of what changed, one line each, in the reader's language. */
function Changes({ list, vi, label }) {
  return (
    <ul className="flex max-h-[min(50vh,22rem)] flex-col gap-2.5 overflow-y-auto overscroll-contain" aria-label={label}>
      {list.map((entry) => (
        <li key={entry.id} className="flex gap-2.5 text-fine leading-snug text-bone">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {entry.version && <b className="mr-1.5 inline-block rounded-full border border-line-strong px-1.5 font-mono text-[0.66rem] leading-[1.15rem] font-medium text-bone-dim tabular-nums">v{entry.version}</b>}
            {changeText(entry, vi)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Two small notices at the top of the screen. When a newer version has been downloaded: a pill that says so, with a way to
 * read what is in it before choosing. After the app has been updated: a short note of what the new version brought.
 */
export default function UpdateToast() {
  const { ready, dismissed, changes, news } = useUpdate();
  const [permission, setPermission] = useState(noticePermission);
  const [open, setOpen] = useState(false);
  const vi = vietnamese();
  const words = copy(vi);

  if (!ready && news.length) {
    return (
      <div role="status" aria-live="polite" className={HOLDER} data-update-news>
        <div className={PANEL}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="shrink-0 text-signal" aria-hidden="true" />
            <b className="min-w-0 flex-1 font-mono text-fine font-medium text-bone">{news[0].version ? words.updatedTo(news[0].version) : words.updated}</b>
            <button type="button" onClick={dismissNews} aria-label={words.close} className="grid size-8 shrink-0 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <Changes list={news} vi={vi} label={words.news} />
        </div>
      </div>
    );
  }

  if (!ready || dismissed) return null;
  return (
    <div role="status" aria-live="polite" className={HOLDER} data-update-toast>
      <div className="flex items-center gap-2.5 rounded-full border border-line-strong bg-ink-1/90 py-1.5 pr-1.5 pl-4 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)] backdrop-blur-2xl">
        <span className="relative grid size-2.5 shrink-0 place-items-center" aria-hidden="true">
          <i className="absolute size-2.5 animate-ping rounded-full bg-signal/60 [animation-duration:2s]" />
          <i className="size-2 rounded-full bg-signal" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-fine text-bone">
          {words.text}
          {changes[0]?.version && <span className="text-bone-dim"> · v{changes[0].version}</span>}
        </span>
        {permission === 'default' && (
          <button type="button" onClick={() => enableNotices().then(setPermission)} aria-label={words.notify} title={words.notify} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90" data-enable-notices>
            <Bell size={15} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={applyUpdate} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-bone px-3.5 font-mono text-[0.78rem] font-medium text-ink-0 transition-transform active:scale-95">
          <RefreshCw size={13} aria-hidden="true" /> {words.update}
        </button>
        <button type="button" onClick={later} aria-label={words.later} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {changes.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1.5 self-center rounded-full border border-line-strong bg-ink-1/90 px-3.5 py-1.5 font-mono text-[0.76rem] text-bone-dim backdrop-blur-2xl hover:text-bone" data-update-whats-new>
            <Sparkles size={12} className="text-signal" aria-hidden="true" /> {open ? words.hide : words.news}
            <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
          </button>
          {open && (
            <div className={PANEL}>
              <Changes list={changes} vi={vi} label={words.news} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
