import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, LockKeyhole, LogOut, MoreHorizontal, RotateCcw, X } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { NAVIGATION, NAV_SECTIONS } from '../navigation';

// The four places a phone reaches most often; everything else lives under "More".
const PINNED = ['hank', 'rag', 'notes', 'music'];
// the bar is narrow: short names for the slots (the sheet and screen readers keep the full ones)
const SHORT = { hank: 'Home', rag: 'Hank', notes: 'Notes', music: 'Music' };

const SLOT = 'relative flex min-w-0 flex-col items-center justify-end gap-1 pb-2.5 font-mono text-[0.66rem] transition-colors active:scale-95';

/** The navigation on a phone: a bar at the thumb's reach, and a sheet with every tab, grouped. */
export default function MobileNav({ tab, onTab, guest, app, onNotify, onLogout, onResetDemo }) {
  const [open, setOpen] = useState(false);
  const pinned = PINNED.map((id) => NAVIGATION.find((item) => item.id === id));

  const go = (id) => {
    setOpen(false);
    navigator.vibrate?.(6);
    // tapping the tab you are on scrolls it back to the top, as in a native app
    if (id === tab) window.scrollTo({ top: 0, behavior: 'smooth' });
    else onTab(id);
  };

  // the bubble and the notch in the bar follow the active slot (0..4); --notch is animated, see @property in index.css
  const slot = pinned.findIndex((item) => item.id === tab);
  const at = slot === -1 ? PINNED.length : slot;
  const ActiveIcon = slot === -1 ? MoreHorizontal : pinned[slot].icon;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <nav
        aria-label="Workspace"
        className="fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-30 h-[4.1rem] [transition:--notch_0.55s_cubic-bezier(0.16,1,0.3,1)]"
        style={{ '--notch': `${(at * 2 + 1) * 10}%` }}
        data-mobile-nav
      >
        <span aria-hidden="true" className="notch-bar absolute inset-0 rounded-[1.8rem] border border-line bg-ink-1/95 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)] backdrop-blur-xl" />
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
            <button type="button" aria-label="More" className={clsx(SLOT, slot === -1 ? 'font-medium text-bone' : 'text-bone-faint')}>
              <MoreHorizontal size={20} strokeWidth={1.7} aria-hidden="true" className={clsx('transition-all duration-300', slot === -1 && 'scale-50 opacity-0')} />
              <span>More</span>
            </button>
          </Dialog.Trigger>
        </div>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col rounded-t-[2rem] border border-b-0 border-line bg-ink-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-30px_80px_-30px_rgb(0_0_0/0.9)]"
        >
          <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <Dialog.Title className="font-display text-lead text-bone">Everything in Hank62</Dialog.Title>
            <Dialog.Close aria-label="Close" className="grid size-9 place-items-center rounded-full text-bone-dim hover:bg-white/5 hover:text-bone">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-1 pb-5">
            {NAV_SECTIONS.map((section) => (
              <section key={section} aria-label={section}>
                <h2 className="mb-2 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint">{section}</h2>
                <ul className="grid grid-cols-3 gap-2">
                  {NAVIGATION.filter((item) => item.section === section).map(({ id, label, icon: Icon }) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => go(id)}
                        aria-current={tab === id ? 'page' : undefined}
                        className={clsx('flex h-full w-full flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center font-mono text-[0.72rem] leading-tight transition-colors', tab === id ? 'border-signal/50 bg-signal-soft text-bone' : 'border-line bg-ink-2/60 text-bone-dim active:bg-ink-3')}
                      >
                        <Icon size={20} strokeWidth={1.7} aria-hidden="true" className={tab === id ? 'text-signal' : ''} />
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {(app?.canInstall || app?.ios) && (
                <button
                  type="button"
                  onClick={() => (app.canInstall ? app.install() : onNotify?.('On iPhone: tap Share, then Add to Home Screen'))}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim"
                >
                  <Download size={15} aria-hidden="true" /> Install app
                </button>
              )}
              {guest && (
                <button type="button" onClick={onResetDemo} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim">
                  <RotateCcw size={15} aria-hidden="true" /> Reset demo data
                </button>
              )}
              <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim">
                {guest ? <LogOut size={15} aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />} {guest ? 'Exit demo' : 'Lock workspace'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
