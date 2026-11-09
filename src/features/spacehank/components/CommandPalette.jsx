import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CornerDownLeft, Inbox, MessageCircleQuestion, Music2, Search, Sparkles } from 'lucide-react';
import { Button, Loading, SkeletonLines } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { filterCommands } from '../model/commands';
import { looksLikeRequest } from '../model/nlcommands';
import { looksLikeQuestion } from '../search/model';
import { library } from '../music/library';
import { playTrack } from '../music/player';
import { useStore } from '../store';
import { tr } from '../lang';
import { useDebounce } from '../../../hooks/useDebounce';

const MAX_TRACKS = 6;
const ASK_ID = 'ask-hank';
const ASK_DATA_ID = 'ask-data';
const CAPTURE_ID = 'capture-line';
const IDLE = { status: 'idle' };

/**
 * Ctrl/⌘ K: jump anywhere, run an action, focus an agent or play a song, by typing a few letters. Commands
 * are plain data ({ id, label, hint, keywords, icon, run }); songs from the private library are added while
 * you type, when `music` is on.
 *
 * `onSearch(query)` adds matches from everything that is kept (notes, tasks, spending, memos, habits, study); `onAnswer(query)`
 * answers a question from that data; `onCapture(query)` puts the typed words in the Inbox.
 *
 * With `onInterpret`, a sentence ("give Codex a task to fix the login bug") gets an extra "Ask Hank" row. Hank
 * works out which action it means, the palette says what it understood, and nothing runs until you confirm.
 */
export default function CommandPalette({ open, onOpenChange, commands, music, onInterpret, onRun, onSearch, onAnswer, onCapture }) {
  const [query, setQuery] = useState('');
  // what is searched: the typed words once typing pauses, so the list (and the search through everything kept) does not redo itself on every key
  const search = useDebounce(query);
  const [active, setActive] = useState(0);
  const [ask, setAsk] = useState(IDLE); // idle | thinking | confirm | refused
  const list = useRef(null);
  // the bar behind the chosen row: it slides to the row you move to, instead of the highlight jumping
  const [bar, setBar] = useState(null);
  const tracks = useStore(library, (s) => s.tracks);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setAsk(IDLE);
    }
  }, [open]);

  const results = useMemo(() => {
    const found = filterCommands(commands, search);
    let all = found;
    if (music && search.trim().length >= 2) {
      const songs = filterCommands(
        tracks.map((t) => ({ id: `track-${t.id}`, label: t.title, hint: t.artist || tr('Song'), keywords: `${t.album} ${t.genre}`, track: t })),
        search,
        MAX_TRACKS
      ).map((song) => ({
        id: song.id,
        label: tr('Play {0}', song.label),
        hint: song.hint,
        icon: Music2,
        run: () => playTrack(song.track.id, tracks.map((t) => t.id)),
      }));
      all = [...found, ...songs];
    }
    const typed = search.trim();
    if (onSearch && typed.length >= 2) all = [...all, ...onSearch(typed)];
    if (onCapture && typed.length >= 3) all = [...all, { id: CAPTURE_ID, label: tr('Add "{0}" to your Inbox', typed), hint: tr('Capture'), icon: Inbox }];
    const top = [];
    if (onAnswer && looksLikeQuestion(typed)) top.push({ id: ASK_DATA_ID, label: tr('Ask about my data: {0}', typed), hint: tr('AI'), icon: MessageCircleQuestion });
    // a whole sentence is most likely a request, so offer Hank first
    if (onInterpret && looksLikeRequest(search)) top.push({ id: ASK_ID, label: tr('Ask Hank: {0}', typed), hint: tr('AI'), icon: Sparkles });
    return [...top, ...all];
  }, [commands, search, music, tracks, onInterpret, onSearch, onAnswer, onCapture]);

  useEffect(() => setActive(0), [search]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  useLayoutEffect(() => {
    const row = list.current?.querySelector('[aria-selected="true"]');
    setBar(row ? { top: row.offsetTop, height: row.offsetHeight } : null);
  }, [active, results, ask.status]);

  const interpret = async () => {
    setAsk({ status: 'thinking' });
    try {
      const outcome = await onInterpret(search.trim());
      setAsk(outcome.ok ? { status: 'confirm', parsed: outcome } : { status: 'refused', say: outcome.say });
    } catch (error) {
      setAsk({ status: 'refused', say: error.message });
    }
  };

  const answer = async () => {
    setAsk({ status: 'answering' });
    try {
      const reply = await onAnswer(search.trim());
      setAsk({ status: 'answer', text: reply.answer });
    } catch (error) {
      setAsk({ status: 'refused', say: error.message });
    }
  };

  const confirm = () => {
    const { parsed } = ask;
    onOpenChange(false);
    window.setTimeout(() => onRun(parsed), 0);
  };

  const run = (command) => {
    if (command.id === ASK_ID) {
      void interpret();
      return;
    }
    if (command.id === ASK_DATA_ID) {
      void answer();
      return;
    }
    if (command.id === CAPTURE_ID) {
      onOpenChange(false);
      window.setTimeout(() => onCapture(search.trim()), 0);
      return;
    }
    onOpenChange(false);
    // let the dialog close first, so focus returns before the command moves the page
    window.setTimeout(() => command.run(), 0);
  };

  const onKeyDown = (event) => {
    if (ask.status !== 'idle') {
      if (event.key === 'Enter' && ask.status === 'confirm') {
        event.preventDefault();
        confirm();
      }
      return;
    }
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
          onEscapeKeyDown={(event) => {
            // Esc first backs out of Hank's answer, and only then closes the palette
            if (ask.status !== 'idle') {
              event.preventDefault();
              setAsk(IDLE);
            }
          }}
          data-palette
        >
          <Dialog.Title className="sr-only">{tr('Command palette')}</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search size={16} className="text-bone-faint" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={ask.status === 'idle' && results[active] ? `palette-${results[active].id}` : undefined}
              aria-label={tr('Search commands, tabs and songs')}
              placeholder={onInterpret ? tr('Type a command, or tell Hank what to do…') : tr('Type a command, a tab or a song…')}
              className="h-14 flex-1 bg-transparent text-body text-bone placeholder:text-bone-faint focus:outline-none"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAsk(IDLE);
              }}
              onKeyDown={onKeyDown}
            />
            <kbd className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.68rem] text-bone-faint">{tr('ESC')}</kbd>
          </div>

          {ask.status === 'idle' ? (
            <ul ref={list} id="palette-list" role="listbox" aria-label={tr('Results')} className="relative max-h-[50vh] overflow-y-auto p-2">
              {bar && results.length > 0 && <span aria-hidden="true" className="palette-bar pointer-events-none absolute inset-x-2 top-0 rounded-sm bg-ink-3" style={{ height: bar.height, transform: `translateY(${bar.top}px)` }} />}
              {results.length === 0 && <li className="px-3 py-6 text-center font-mono text-fine text-bone-faint">{tr('Nothing matches "')}{search}".</li>}
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
                    className={clsx('relative flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5', index === active ? 'text-bone' : 'text-bone-dim')}
                  >
                    {Icon && <Icon size={16} className={index === active || command.id === ASK_ID || command.id === ASK_DATA_ID ? 'text-signal' : 'text-bone-faint'} aria-hidden="true" />}
                    <span className="flex-1 truncate text-fine">{command.label}</span>
                    {command.hint && <span className="shrink-0 font-mono text-[0.72rem] text-bone-faint">{command.hint}</span>}
                    {index === active && <CornerDownLeft size={13} className="shrink-0 text-bone-faint" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-4 p-5" role="status" aria-live="polite" data-ask={ask.status}>
              {ask.status === 'thinking' && (
                <Loading label={tr('Hank is working out what you mean')}>
                  <SkeletonLines lines={2} />
                </Loading>
              )}
              {ask.status === 'confirm' && (
                <>
                  <div>
                    <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Hank understood')}</span>
                    <p className="mt-1 font-display text-h3 leading-tight text-bone" data-understood>
                      {ask.parsed.describe}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={confirm}>
                      {tr('Do it')} <CornerDownLeft size={13} aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAsk(IDLE)}>
                      {tr('Not that')}
                    </Button>
                  </div>
                </>
              )}
              {ask.status === 'answering' && (
                <Loading label={tr('Hank is reading your notes, tasks and spending')}>
                  <SkeletonLines lines={3} />
                </Loading>
              )}
              {ask.status === 'answer' && (
                <>
                  <p className="text-body leading-relaxed whitespace-pre-line text-bone" data-answer>
                    {ask.text}
                  </p>
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setAsk(IDLE)}>
                      {tr('Back to search')}
                    </Button>
                  </div>
                </>
              )}
              {ask.status === 'refused' && (
                <>
                  <p className="text-bone-dim" data-refused>
                    {ask.say}
                  </p>
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => setAsk(IDLE)}>
                      {tr('Back to search')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-4 border-t border-line px-4 py-2 font-mono text-[0.68rem] text-bone-faint">
            {ask.status === 'confirm' ? (
              <>
                <span>{tr('↵ do it')}</span>
                <span>{tr('esc back')}</span>
              </>
            ) : (
              <>
                <span>{tr('↑↓ move')}</span>
                <span>{tr('↵ run')}</span>
                <span>{tr('esc close')}</span>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
