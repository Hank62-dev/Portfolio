import { tr } from '../lang';
import SyncStatus from './SyncStatus';
import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, Download, LockKeyhole, LogOut, MoreHorizontal, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { clsx } from '../../shared/lib/format';
import { LangPills } from './LangSwitch';
import { ThemePills } from './ThemeMenu';
import AppIcon from './AppIcon';
import { NAVIGATION } from '../navigation';
import { bySection, openModules, useNav } from '../modules';
import { useDebounce } from '../../shared/hooks/useDebounce';

const matches = (item, q) => !q || `${item.label} ${item.section} ${item.keywords ?? ''}`.toLowerCase().includes(q);

// The four places a phone reaches most often; everything else lives under "More".
const PINNED = ['hank', 'rag', 'notes', 'music'];
// the bar is narrow: short names for the slots (the sheet and screen readers keep the full ones)
const SHORT = { hank: 'Home', rag: 'Hank', notes: 'Notes', music: 'Music' };

const SLOT = 'relative flex min-w-0 flex-col items-center justify-end gap-1 pb-2.5 font-mono text-[0.66rem] transition-colors active:scale-95';

/** The navigation on a phone: a bar at the thumb's reach, and a sheet with every tab, grouped. */
export default function MobileNav({ tab, onTab, guest, app, onNotify, onLogout, onResetDemo }) {
  const [open, setOpen] = useState(false);
  // the sheet follows a finger that drags it down, and closes when let go far enough
  const [drag, setDrag] = useState({ y: 0, active: false });
  const start = useRef(null);
  const scroller = useRef(null);
  const [more, setMore] = useState(false); // there is more of the list below
  const [query, setQuery] = useState('');
  const search = useDebounce(query);
  const q = search.trim().toLowerCase();
  const visible = useNav();
  const found = visible.filter((item) => matches(item, q));
  const pinned = PINNED.map((id) => NAVIGATION.find((item) => item.id === id));

  const go = (id) => {
    setOpen(false);
    setQuery('');
    navigator.vibrate?.(6);
    // tapping the tab you are on scrolls it back to the top, as in a native app
    if (id === tab) window.scrollTo({ top: 0, behavior: 'smooth' });
    else onTab(id);
  };

  const begin = (y) => {
    start.current = y;
  };
  const follow = (y, atTop = true) => {
    if (start.current === null || !atTop) return;
    const dy = Math.max(0, y - start.current);
    if (dy > 0) setDrag({ y: dy, active: true });
  };
  const release = () => {
    const far = drag.y > 110;
    start.current = null;
    setDrag({ y: 0, active: false });
    if (far) setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    let el;
    let on;
    // the list is in a portal that mounts with the sheet, so look for it on the next frame
    const frame = requestAnimationFrame(() => {
      el = scroller.current;
      if (!el) return;
      on = () => setMore(el.scrollTop < 8 && el.scrollHeight - el.clientHeight > 24);
      on();
      el.addEventListener('scroll', on, { passive: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (el && on) el.removeEventListener('scroll', on);
    };
  }, [open, q]);

  // the bubble and the notch in the bar follow the active slot (0..4); --notch is animated, see @property in index.css
  const slot = pinned.findIndex((item) => item.id === tab);
  const at = slot === -1 ? PINNED.length : slot;
  const ActiveIcon = slot === -1 ? MoreHorizontal : pinned[slot].icon;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
      <nav
        aria-label={tr('Workspace')}
        className="fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-30 h-[4.1rem] [transition:--notch_0.55s_cubic-bezier(0.16,1,0.3,1)]"
        style={{ '--notch': `${(at * 2 + 1) * 10}%` }}
        data-mobile-nav
      >
        <span aria-hidden="true" className="notch-bar absolute inset-0 rounded-[1.8rem] border border-line bg-ink-1/95 shadow-[0_18px_40px_-14px_rgb(var(--shadow-rgb)/0.9)] backdrop-blur-xl" />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => (slot === -1 ? setOpen(true) : go(tab))}
          className="absolute top-[-1.45rem] left-[var(--notch)] grid size-[3.4rem] -translate-x-1/2 place-items-center rounded-full bg-signal text-ink-0 shadow-[0_12px_26px_-8px_var(--color-signal)] active:scale-95"
        >
          <ActiveIcon key={tab} size={23} strokeWidth={1.9} className="animate-fade-in" />
        </button>
        <div className="relative grid h-full grid-cols-5">
          {pinned.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} aria-label={label} aria-current={tab === id ? 'page' : undefined} className={clsx(SLOT, tab === id ? 'font-medium text-bone' : 'text-bone-faint')}>
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" className={clsx('transition-all duration-300', tab === id && 'scale-50 opacity-0')} />
              <span>{SHORT[id] ?? label}</span>
            </button>
          ))}
          <Dialog.Trigger asChild>
            <button type="button" aria-label={tr('More')} className={clsx(SLOT, slot === -1 ? 'font-medium text-bone' : 'text-bone-faint')}>
              <MoreHorizontal size={20} strokeWidth={1.7} aria-hidden="true" className={clsx('transition-all duration-300', slot === -1 && 'scale-50 opacity-0')} />
              <span>{tr('More')}</span>
            </button>
          </Dialog.Trigger>
        </div>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[2rem] border border-b-0 border-line bg-ink-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-30px_80px_-30px_rgb(var(--shadow-rgb)/0.9)] [animation:sheet-up_0.38s_cubic-bezier(0.16,1,0.3,1)_backwards]"
          style={{ transform: drag.y ? `translateY(${drag.y}px)` : undefined, transition: drag.active ? 'none' : 'transform 0.28s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* hold the handle or the title and pull down to put the sheet away */}
          <div
            className="touch-none select-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              begin(e.clientY);
            }}
            onPointerMove={(e) => follow(e.clientY)}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <span className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
            <div className="relative flex items-end justify-between px-5 pt-3 pb-3">
              <div className="min-w-0">
                <p className="mb-1.5 font-mono text-[0.6rem] tracking-[0.22em] text-bone-faint">{tr('INDEX ·')} {String(visible.length).padStart(2, '0')} {tr('PLACES')}</p>
                <Dialog.Title className="font-display text-[1.95rem] leading-none font-normal tracking-tight text-bone">
                  {tr('Everything in')} <em className="text-signal">{tr('Hank62')}</em>
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={tr('Close')} className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-line text-bone-dim hover:text-bone active:scale-90">
                <X size={16} aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>

          <div className="relative mx-5 mb-4">
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-bone-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && found[0]) go(found[0].id);
              }}
              placeholder={tr('Find a place: music, notes, money')}
              aria-label={tr('Find a place')}
              enterKeyHint="go"
              autoComplete="off"
              className="h-10 w-full border-b border-line-strong bg-transparent pl-6 font-mono text-fine text-bone transition-colors placeholder:text-bone-faint focus:border-signal focus:outline-none"
            />
          </div>

          <div className="relative flex min-h-0 flex-col">
          <div
            ref={scroller}
            className="no-scrollbar flex flex-col gap-6 overflow-y-auto overscroll-contain px-5 pt-1 pb-5"
            onTouchStart={(e) => begin(e.touches[0].clientY)}
            onTouchMove={(e) => follow(e.touches[0].clientY, (scroller.current?.scrollTop ?? 0) <= 0)}
            onTouchEnd={release}
            onTouchCancel={release}
          >
            {found.length > 0 && (
              <div className="flex flex-col gap-5 pt-1" key={q}>
                {(q ? [{ section: '', items: found }] : bySection(found)).map(({ section, items }) => (
                  <div key={section || 'found'}>
                    {section && <p className="mb-3 font-mono text-[0.62rem] tracking-[0.18em] text-bone-faint uppercase">{tr(section)}</p>}
                    <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
                      {items.map((item) => (
                        <AppIcon key={item.id} item={item} index={found.indexOf(item)} current={tab === item.id} onPick={go} className="sheet-tile" />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {!found.length && (
              <p className="py-8 text-center font-mono text-fine text-bone-faint" role="status">
                {tr('Nothing here called “')}{search.trim()}{tr('”. Try “notes”, “money” or “play”.')}
              </p>
            )}

            {!q && (
              <>
                <ThemePills className="border-t border-line pt-4" />
                <LangPills />
                {!guest && <SyncStatus className="border-t border-line pt-3" />}
              </>
            )}
            <div className={clsx('flex flex-wrap gap-2 border-t border-line pt-4', q && 'hidden')}>
              {(app?.canInstall || app?.ios) && (
                <button
                  type="button"
                  onClick={() => (app.canInstall ? app.install() : onNotify?.(tr('On iPhone: tap Share, then Add to Home Screen')))}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim"
                >
                  <Download size={15} aria-hidden="true" /> {tr('Install app')}
                </button>
              )}
              {guest && (
                <button type="button" onClick={onResetDemo} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim">
                  <RotateCcw size={15} aria-hidden="true" /> {tr('Reset demo data')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openModules();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim"
              >
                <SlidersHorizontal size={15} aria-hidden="true" /> {tr('Choose places')}
              </button>
              <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim">
                {guest ? <LogOut size={15} aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />} {guest ? tr('Exit demo') : tr('Lock workspace')}
              </button>
            </div>
          </div>
          <button
            type="button"
            tabIndex={more ? 0 : -1}
            aria-hidden={!more}
            aria-label={tr('Scroll down for more')}
            onClick={() => scroller.current?.scrollBy({ top: 240, behavior: 'smooth' })}
            className={clsx('absolute bottom-2 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-line bg-ink-2/90 text-bone-dim shadow-[0_8px_20px_-8px_rgb(var(--shadow-rgb)/0.8)] backdrop-blur transition-all duration-300 active:scale-90', more ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0')}
            data-sheet-scroll-hint
          >
            <ChevronDown size={16} className="animate-nudge" aria-hidden="true" />
          </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
