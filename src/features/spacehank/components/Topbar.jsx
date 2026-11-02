import { ChevronRight, Command, Pause, Play, Plus, Search } from 'lucide-react';
import { Avatar, Badge, Button, Tooltip } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { owner } from '../config';
import { NAVIGATION } from '../navigation';

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform ?? '');

export default function Topbar({ tab, connected, guest, paused, onPause, onNewTask, onPalette }) {
  const current = NAVIGATION.find((item) => item.id === tab) || NAVIGATION[0];
  const pauseLabel = paused ? 'Resume floor' : 'Pause floor';
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink-0/85 px-gutter backdrop-blur max-md:h-[calc(4rem+env(safe-area-inset-top))] max-md:border-b-0 max-md:bg-ink-0/90 max-md:pt-[env(safe-area-inset-top)]">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-mono text-fine text-bone-faint">
        <span className="max-md:hidden">HANK62</span>
        <ChevronRight size={14} aria-hidden="true" className="shrink-0 max-md:hidden" />
        {/* on a phone the bar is an app's title bar: the screen's name, set large */}
        <b className="truncate font-medium text-bone max-md:font-display max-md:text-[1.55rem] max-md:leading-none max-md:font-normal max-md:tracking-tight max-md:[font-feature-settings:normal]">
          <span className="flex flex-col gap-1 md:hidden">
            <small className="font-mono text-[0.6rem] leading-none font-normal tracking-[0.16em] text-signal uppercase">{current.section}</small>
            {current.label}
          </span>
          <span className="max-md:hidden">{current.label.toUpperCase()}</span>
        </b>
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onPalette}
          aria-label="Open the command palette"
          className="flex h-9 items-center gap-2 rounded-sm border border-line bg-ink-2 px-3 font-mono text-fine text-bone-dim transition-colors hover:border-line-strong hover:text-bone max-md:size-10 max-md:justify-center max-md:rounded-full max-md:border-0 max-md:bg-white/6 max-md:p-0"
          data-palette-button
        >
          <Command size={14} aria-hidden="true" className="max-md:hidden" />
          <Search size={18} aria-hidden="true" className="md:hidden" />
          <span className="max-md:hidden">Search</span>
          <kbd className="rounded-sm border border-line px-1 text-[0.68rem] text-bone-faint max-md:hidden">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        {/* On narrow screens only the status dot stays visible; the text remains for screen readers. */}
        <Badge tone={guest ? 'warn' : connected ? 'ok' : 'danger'} dot>
          <span className={guest ? undefined : 'max-sm:sr-only'}>{guest ? 'DEMO' : connected ? 'REALTIME LINK' : 'SERVER OFFLINE'}</span>
        </Badge>
        <Tooltip content={pauseLabel} side="bottom">
          <Button variant="secondary" size="icon" aria-label={pauseLabel} onClick={onPause} className={tab === 'space' ? undefined : 'max-md:hidden'}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </Button>
        </Tooltip>
        <Button size="sm" onClick={onNewTask} aria-label="New task" className={clsx('max-md:size-10 max-md:p-0', tab !== 'hank' && tab !== 'space' && 'max-md:hidden')}>
          <Plus size={15} aria-hidden="true" /> <span className="max-sm:sr-only">New task</span>
        </Button>
        <Avatar className="max-sm:hidden">{guest ? 'G' : owner.initials}</Avatar>
      </div>
    </header>
  );
}
