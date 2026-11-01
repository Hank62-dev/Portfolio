import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CornerDownLeft, Music2, Search } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { filterCommands } from '../model/commands';
import { library } from '../music/library';
import { playTrack } from '../music/player';
import { useStore } from '../store';

const MAX_TRACKS = 6;

/**
 * Ctrl/⌘ K: jump anywhere, run an action, focus an agent or play a song, by typing a few letters. Commands
 * are plain data ({ id, label, hint, keywords, icon, run }); songs from the private library are added while
 * you type, when `music` is on.
 */
export default function CommandPalette({ open, onOpenChange, commands, music }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef(null);
  const tracks = useStore(library, (s) => s.tracks);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const found = filterCommands(commands, query);
    if (!music || query.trim().length < 2) return found;
    const songs = filterCommands(
      tracks.map((t) => ({ id: `track-${t.id}`, label: t.title, hint: t.artist || 'Song', keywords: `${t.album} ${t.genre}`, track: t })),
      query,
      MAX_TRACKS
    ).map((song) => ({
      id: song.id,
      label: `Play ${song.label}`,
      hint: song.hint,
      icon: Music2,
      run: () => playTrack(song.track.id, tracks.map((t) => t.id)),
    }));
    return [...found, ...songs];
  }, [commands, query, music, tracks]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (command) => {
    onOpenChange(false);
    // let the dialog close first, so focus returns before the command moves the page
    window.setTimeout(() => command.run(), 0);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      run(results[active]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/65 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed top-[12vh] left-1/2 z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 animate-fade-in overflow-hidden rounded-card border border-line-strong bg-ink-1 shadow-pop"
          aria-describedby={undefined}
          data-palette
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search size={16} className="text-bone-faint" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
              aria-label="Search commands, tabs and songs"
              placeholder="Type a command, a tab or a song…"
              className="h-14 flex-1 bg-transparent text-body text-bone placeholder:text-bone-faint focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <kbd className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.68rem] text-bone-faint">ESC</kbd>
          </div>

          <ul ref={list} id="palette-list" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 && <li className="px-3 py-6 text-center font-mono text-fine text-bone-faint">Nothing matches "{query}".</li>}
            {results.map((command, index) => {
              const Icon = command.icon;
              return (
                <li
                  key={command.id}
                  id={`palette-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(command)}
                  className={clsx('flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5', index === active ? 'bg-ink-3 text-bone' : 'text-bone-dim')}
                >
                  {Icon && <Icon size={16} className={index === active ? 'text-signal' : 'text-bone-faint'} aria-hidden="true" />}
                  <span className="flex-1 truncate text-fine">{command.label}</span>
                  {command.hint && <span className="shrink-0 font-mono text-[0.72rem] text-bone-faint">{command.hint}</span>}
                  {index === active && <CornerDownLeft size={13} className="shrink-0 text-bone-faint" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>

          <div className="flex gap-4 border-t border-line px-4 py-2 font-mono text-[0.68rem] text-bone-faint">
            <span>↑↓ move</span>
            <span>↵ run</span>
            <span>esc close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
