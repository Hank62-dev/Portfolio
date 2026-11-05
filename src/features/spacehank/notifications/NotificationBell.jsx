import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { ArrowLeft, Bell, BellOff, CheckCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useSheetDrag } from '../../../design-system/useSheetDrag';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { clsx } from '../../../lib/format';
import { tabAccent, tabHue } from '../navigation';
import { useStore } from '../store';
import { ago, center, clearAll, groupByDay, markAllRead, markRead, permission, remove, setKind, setPush, unreadCount } from './center';
import { KINDS, kindOf } from './kinds';
import { disablePush, enablePush, pushState, refreshPush, syncPushKinds, testNotification } from './push';

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={clsx('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-signal' : 'bg-wash/15')}>
      <i className={clsx('absolute top-0.5 size-5 rounded-full bg-bone shadow transition-all duration-300 ease-out-expo', checked ? 'left-[1.15rem]' : 'left-0.5')} aria-hidden="true" />
    </button>
  );
}

function Row({ item, onOpen }) {
  const Icon = kindOf(item.kind).icon;
  return (
    <li className="group relative">
      {!item.read && <i className="absolute top-1/2 left-0.5 size-1.5 -translate-y-1/2 rounded-full bg-signal" aria-hidden="true" />}
      <button type="button" onClick={() => onOpen(item)} className="flex w-full items-start gap-3 rounded-xl py-2.5 pr-10 pl-3.5 text-left transition-colors hover:bg-wash/6 focus-visible:bg-wash/6 focus-visible:outline-none">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `hsl(${tabHue(item.tab)} 50% 52% / 0.16)`, color: tabAccent(item.tab) }} aria-hidden="true">
          <Icon size={16} strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <b className={clsx('block text-fine', item.read ? 'font-normal text-bone-dim' : 'font-medium text-bone', item.tone === 'error' && !item.read && 'text-danger')}>{item.title}</b>
          {item.body && <small className="block font-mono text-[0.72rem] leading-snug text-bone-faint">{item.body}</small>}
          <time className="mt-1 block font-mono text-[0.64rem] text-bone-faint/80">{ago(item.at)}</time>
        </span>
      </button>
      <button type="button" aria-label={`Dismiss: ${item.title}`} onClick={() => remove(item.id)} className="absolute top-2.5 right-2 grid size-7 place-items-center rounded-full text-bone-faint opacity-0 transition-opacity hover:bg-wash/10 hover:text-bone focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

function Settings({ prefs }) {
  const state = permission();
  const server = useStore(pushState);
  useEffect(() => {
    void refreshPush();
  }, []);

  // with the server set up, "on this device" means a real push subscription (it works with the app closed)
  const on = server.available ? server.subscribed : prefs.push && state === 'granted';
  const toggle = (next) => (server.available ? (next ? void enablePush() : void disablePush()) : void setPush(next));
  const system =
    state === 'unsupported'
      ? 'This browser cannot show notifications outside the app. On iPhone, add the app to the Home Screen first.'
      : state === 'denied'
        ? 'Blocked for this site. Allow notifications in the browser’s site settings.'
        : server.available
          ? on
            ? 'Reminders reach this device even when the app is closed.'
            : 'Turn on to get reminders even when the app is closed.'
          : 'Reminders appear on this device while the app is open or in the background.';

  return (
    <div className="flex flex-col gap-4 px-3.5 pb-4">
      <section className="rounded-2xl border border-line bg-ink-2/60 p-3.5">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block text-fine font-medium text-bone">On this device</b>
            <small className="mt-1 block font-mono text-[0.72rem] leading-snug text-bone-faint">{system}</small>
          </span>
          {state !== 'unsupported' && state !== 'denied' && <Switch label="Notifications on this device" checked={on} onChange={toggle} />}
        </div>
        {server.error && (
          <p className="mt-2 font-mono text-[0.72rem] leading-snug text-danger" role="alert">
            {server.error}
          </p>
        )}
        {on && (
          <button type="button" disabled={server.busy} onClick={() => void testNotification()} className="mt-3 rounded-full border border-line-strong px-3 py-1 font-mono text-[0.72rem] text-bone-dim transition-colors hover:text-bone disabled:opacity-50">
            Send a test
          </button>
        )}
      </section>
      <section>
        <h3 className="px-1 pb-1.5 font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">Tell me about</h3>
        <ul className="flex flex-col">
          {KINDS.map(({ id, label, hint, icon: Icon }) => (
            <li key={id} className="flex items-center gap-3 rounded-xl px-1 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-wash/7 text-bone-dim" aria-hidden="true">
                <Icon size={15} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block text-fine font-medium text-bone">{label}</b>
                <small className="block font-mono text-[0.68rem] text-bone-faint">{hint}</small>
              </span>
              <Switch label={label} checked={prefs.kinds[id]} onChange={(next) => { setKind(id, next); void syncPushKinds(); }} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** The bell's panel: today's notifications grouped by day, with a settings page behind the sliders icon. */
function Panel({ onClose, onOpenTab, scroll }) {
  const { items, prefs } = useStore(center);
  const [view, setView] = useState('list');
  const unread = items.filter((item) => !item.read).length;
  const sections = groupByDay(items);

  const open = (item) => {
    markRead(item.id);
    onOpenTab?.(item.tab);
    onClose();
  };

  return (
    <div className={clsx('flex min-h-0 flex-1 flex-col', !scroll && 'overflow-hidden')}>
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-ink-1/95 px-4 pt-4 pb-3 backdrop-blur-xl">
        {view === 'settings' && (
          <button type="button" aria-label="Back to notifications" onClick={() => setView('list')} className="-ml-1.5 grid size-8 place-items-center rounded-full text-bone-dim hover:bg-wash/8 hover:text-bone">
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="font-display text-[1.35rem] text-bone">{view === 'settings' ? 'Settings' : 'Notifications'}</h2>
          {view === 'list' && <small className="font-mono text-[0.68rem] text-bone-faint">{unread ? `${unread} unread` : items.length ? 'All read' : 'Nothing yet'}</small>}
        </div>
        {view === 'list' && (
          <>
            <button type="button" aria-label="Mark all as read" title="Mark all as read" disabled={!unread} onClick={markAllRead} className="grid size-8 place-items-center rounded-full text-bone-dim transition-colors hover:bg-wash/8 hover:text-bone disabled:opacity-30 disabled:hover:bg-transparent">
              <CheckCheck size={16} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Clear all" title="Clear all" disabled={!items.length} onClick={clearAll} className="grid size-8 place-items-center rounded-full text-bone-dim transition-colors hover:bg-wash/8 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent">
              <Trash2 size={15} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Notification settings" title="Settings" onClick={() => setView('settings')} className="grid size-8 place-items-center rounded-full text-bone-dim transition-colors hover:bg-wash/8 hover:text-bone">
              <SlidersHorizontal size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </header>

      <div className={clsx('min-h-0 flex-1', scroll ? '' : 'overflow-y-auto overscroll-contain')}>
        {view === 'settings' ? (
          <Settings prefs={prefs} />
        ) : sections.length ? (
          <div className="flex flex-col gap-1 px-1.5 pb-3">
            {sections.map((section) => (
              <section key={section.label} aria-label={section.label}>
                <h3 className="px-3 pt-2 pb-1 font-mono text-[0.64rem] tracking-[0.16em] text-bone-faint uppercase">{section.label}</h3>
                <ul>
                  {section.items.map((item) => (
                    <Row key={item.id} item={item} onOpen={open} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-8 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-wash/6 text-bone-faint" aria-hidden="true">
              <BellOff size={24} strokeWidth={1.4} />
            </span>
            <b className="font-display text-[1.2rem] font-normal text-bone">You’re all caught up</b>
            <p className="max-w-[26ch] text-fine text-bone-dim">Events, flashcards, tasks, habits and budgets will tell you here when they need you.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** The bell in the top bar, with a count of what is unread, and the panel it opens: a dropdown on a desktop, a sheet on a phone. */
export default function NotificationBell({ onOpenTab, phone = false }) {
  const state = useStore(center);
  const unread = unreadCount(state);
  const [open, setOpen] = useState(false);
  const small = useMediaQuery('(max-width: 759px)');
  const drag = useSheetDrag(() => setOpen(false));

  // the bell rings when something new arrives
  const [ringing, setRinging] = useState(false);
  const before = useRef(unread);
  useEffect(() => {
    if (unread > before.current) {
      setRinging(true);
      const timer = window.setTimeout(() => setRinging(false), 1000);
      before.current = unread;
      return () => window.clearTimeout(timer);
    }
    before.current = unread;
    return undefined;
  }, [unread]);

  // an installed app shows the count on its icon too
  useEffect(() => {
    if (unread) void navigator.setAppBadge?.(unread).catch?.(() => {});
    else void navigator.clearAppBadge?.().catch?.(() => {});
  }, [unread]);

  const button = (
    <button
      type="button"
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className={clsx('relative grid place-items-center transition-colors active:scale-90', phone ? 'size-10 rounded-full bg-wash/7 text-bone' : 'size-9 rounded-sm border border-line bg-ink-2 text-bone-dim hover:text-bone', open && !phone && 'border-line-strong text-bone')}
      data-notification-bell
    >
      <Bell size={phone ? 18 : 16} className={clsx(ringing && 'animate-bell origin-top')} aria-hidden="true" />
      {unread > 0 && (
        <b key={unread} className="absolute -top-1 -right-1 grid h-[1.05rem] min-w-[1.05rem] animate-pop-in place-items-center rounded-full bg-signal px-1 font-mono text-[0.6rem] leading-none font-semibold text-ink-0 ring-2 ring-ink-0" aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </b>
      )}
    </button>
  );

  if (small) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>{button}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] animate-sheet-up flex-col overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-line-strong bg-ink-1 pb-[env(safe-area-inset-bottom)] shadow-pop outline-none"
            style={drag.style}
            {...drag.bind}
          >
            <Dialog.Title className="sr-only">Notifications</Dialog.Title>
            <Dialog.Description className="sr-only">Reminders and updates, newest first.</Dialog.Description>
            <span className="mx-auto mt-2.5 -mb-1 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
            <Panel scroll onClose={() => setOpen(false)} onOpenTab={onOpenTab} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{button}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} collisionPadding={12} aria-label="Notifications" className="z-[95] flex max-h-[min(34rem,calc(100dvh-6rem))] w-[min(26rem,calc(100vw-1.5rem))] origin-top-right animate-pop-in flex-col overflow-hidden rounded-2xl border border-line-strong bg-ink-1/95 shadow-pop backdrop-blur-2xl outline-none">
          <Panel onClose={() => setOpen(false)} onOpenTab={onOpenTab} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
