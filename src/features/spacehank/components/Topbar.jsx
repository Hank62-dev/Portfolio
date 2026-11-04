import { useEffect, useState } from 'react';
import { ChevronRight, Command, Pause, Play, Plus, Search } from 'lucide-react';
import { Avatar, Badge, Button, Tooltip } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { ThemeMenu } from './ThemeMenu';
import { owner } from '../config';
import { NAVIGATION, tabAccent, tabHue } from '../navigation';

// the realtime link: green when open, amber while it is being (re)opened, red when it is not coming back
const LINK = {
  online: { tone: 'ok', dot: 'bg-ok shadow-[0_0_0_4px_rgb(60_200_130/0.18)]', text: 'REALTIME LINK', title: 'Realtime link' },
  connecting: { tone: 'warn', dot: 'bg-warn', text: 'RECONNECTING', title: 'Reconnecting to the server' },
  offline: { tone: 'danger', dot: 'bg-danger', text: 'SERVER OFFLINE', title: 'Server offline' },
};
const linkOf = (connected, link) => (connected ? 'online' : link === 'connecting' ? 'connecting' : 'offline');

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform ?? '');


/** True once the page has scrolled a little, so the phone's title bar can fold down to a compact one. */
function useScrolled(distance = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > distance);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [distance]);
  return scrolled;
}

/**
 * The phone's title bar, as in a native app: the screen's icon and name in large type that folds down to a compact bar
 * when you scroll, the colour of the screen glowing behind it, and only the actions that belong to this screen.
 */
function PhoneBar({ tab, current, connected, link, guest, paused, onPause, onNewTask, onPalette }) {
  const scrolled = useScrolled();
  const hue = tabHue(tab);
  const Icon = current.icon;
  const agentsScreen = tab === 'hank' || tab === 'space';
  return (
    // the box keeps its height, and sticks 1.1rem above the top once scrolled, so folding never moves the page
    <header
      className={clsx('sticky top-[-1.1rem] z-20 flex h-[calc(4.4rem+env(safe-area-inset-top))] items-end px-gutter pb-2.5 transition-[background-color,box-shadow,backdrop-filter] duration-300 md:hidden', scrolled ? 'bg-ink-0/80 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : 'bg-transparent')}
      data-phone-bar
    >
      <span aria-hidden="true" className={clsx('pointer-events-none absolute inset-0 transition-opacity duration-500', scrolled ? 'opacity-40' : 'opacity-100')} style={{ background: `radial-gradient(80% 140% at 0% 0%, hsl(${hue} 55% 50% / 0.13), transparent 70%)` }} />
      <div className="relative flex w-full items-center gap-3">
        <span
          className={clsx('grid shrink-0 place-items-center border border-line-strong bg-ink-2/80 transition-all duration-300', scrolled ? 'size-8 rounded-[0.7rem]' : 'size-11 rounded-[1rem]')}
          style={{ color: tabAccent(tab) }}
          aria-hidden="true"
        >
          <Icon size={scrolled ? 16 : 22} strokeWidth={1.5} />
        </span>
        <h1 className="min-w-0 flex-1 leading-none">
          <small className={clsx('block overflow-hidden font-mono text-[0.58rem] tracking-[0.18em] text-signal uppercase transition-all duration-300', scrolled ? 'mb-0 max-h-0 opacity-0' : 'mb-1.5 max-h-4 opacity-100')}>{current.section}</small>
          <b className={clsx('block truncate font-display font-normal tracking-tight text-bone transition-[font-size] duration-300', scrolled ? 'text-[1.2rem]' : 'text-[1.65rem]')}>{current.label}</b>
        </h1>
        <div className="flex shrink-0 items-center gap-1.5">
          {guest ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 font-mono text-[0.62rem] tracking-[0.12em] text-warn">
              <i className="size-1.5 rounded-full bg-warn" aria-hidden="true" /> DEMO
            </span>
          ) : (
            <span role="status" className="grid size-7 place-items-center" title={LINK[linkOf(connected, link)].title}>
              <i className={clsx('size-2 rounded-full', LINK[linkOf(connected, link)].dot, linkOf(connected, link) === 'connecting' && 'animate-pulse')} aria-hidden="true" />
              <span className="sr-only">{LINK[linkOf(connected, link)].text}</span>
            </span>
          )}
          {tab === 'space' && (
            <button type="button" aria-label={paused ? 'Resume floor' : 'Pause floor'} onClick={onPause} className="grid size-10 place-items-center rounded-full bg-wash/7 text-bone-dim active:scale-90">
              {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
            </button>
          )}
          <button type="button" aria-label="Open the command palette" onClick={onPalette} className="grid size-10 place-items-center rounded-full bg-wash/7 text-bone active:scale-90" data-palette-button>
            <Search size={18} aria-hidden="true" />
          </button>
          {agentsScreen && (
            <button type="button" aria-label="New task" onClick={onNewTask} className="grid size-10 place-items-center rounded-full bg-signal text-ink-0 shadow-[0_8px_18px_-8px_var(--color-signal)] active:scale-90">
              <Plus size={19} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Topbar({ tab, connected, link, guest, paused, onPause, onNewTask, onPalette }) {
  const current = NAVIGATION.find((item) => item.id === tab) || NAVIGATION[0];
  const pauseLabel = paused ? 'Resume floor' : 'Pause floor';
  return (
    <>
      <PhoneBar tab={tab} current={current} connected={connected} link={link} guest={guest} paused={paused} onPause={onPause} onNewTask={onNewTask} onPalette={onPalette} />
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink-0/85 px-gutter backdrop-blur max-md:hidden">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-mono text-fine text-bone-faint">
        <span>HANK62</span>
        <ChevronRight size={14} aria-hidden="true" className="shrink-0" />
        <b className="truncate font-medium text-bone">{current.label.toUpperCase()}</b>
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onPalette}
          aria-label="Open the command palette"
          className="flex h-9 items-center gap-2 rounded-sm border border-line bg-ink-2 px-3 font-mono text-fine text-bone-dim transition-colors hover:border-line-strong hover:text-bone"
          data-palette-button
        >
          <Command size={14} aria-hidden="true" />
          <span>Search</span>
          <kbd className="rounded-sm border border-line px-1 text-[0.68rem] text-bone-faint">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <Badge tone={guest ? 'warn' : LINK[linkOf(connected, link)].tone} dot>
          {guest ? 'DEMO' : LINK[linkOf(connected, link)].text}
        </Badge>
        <ThemeMenu />
        <Tooltip content={pauseLabel} side="bottom">
          <Button variant="secondary" size="icon" aria-label={pauseLabel} onClick={onPause}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </Button>
        </Tooltip>
        <Button size="sm" onClick={onNewTask} aria-label="New task">
          <Plus size={15} aria-hidden="true" /> New task
        </Button>
        <Avatar>{guest ? 'G' : owner.initials}</Avatar>
      </div>
    </header>
    </>
  );
}
