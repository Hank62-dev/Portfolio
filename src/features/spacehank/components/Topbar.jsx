import { ChevronRight, Pause, Play, Plus } from 'lucide-react';
import { Avatar, Badge, Button, Tooltip } from '../../../design-system';
import { owner } from '../config';
import { NAVIGATION } from '../navigation';

export default function Topbar({ tab, connected, paused, onPause, onNewTask }) {
  const current = NAVIGATION.find((item) => item.id === tab) || NAVIGATION[0];
  const pauseLabel = paused ? 'Resume floor' : 'Pause floor';
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink-0/85 px-gutter backdrop-blur">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-mono text-fine text-bone-faint">
        <span className="max-sm:hidden">HANK62</span>
        <ChevronRight size={14} aria-hidden="true" className="shrink-0 max-sm:hidden" />
        <b className="truncate font-medium text-bone">{current.label.toUpperCase()}</b>
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        {/* On narrow screens only the status dot stays visible; the text remains for screen readers. */}
        <Badge tone={connected ? 'ok' : 'danger'} dot>
          <span className="max-sm:sr-only">{connected ? 'REALTIME LINK' : 'SERVER OFFLINE'}</span>
        </Badge>
        <Tooltip content={pauseLabel} side="bottom">
          <Button variant="secondary" size="icon" aria-label={pauseLabel} onClick={onPause}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </Button>
        </Tooltip>
        <Button size="sm" onClick={onNewTask} aria-label="New task">
          <Plus size={15} aria-hidden="true" /> <span className="max-sm:sr-only">New task</span>
        </Button>
        <Avatar className="max-sm:hidden">{owner.initials}</Avatar>
      </div>
    </header>
  );
}
