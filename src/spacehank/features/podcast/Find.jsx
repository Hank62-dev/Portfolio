import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { Button, Skeleton } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { podcastSearch } from '../../core/api/owner';
import { Cover } from './Controls';
import { showId } from './model';
import { shows } from './store';
import { openShow, podcastUi } from './ui';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { Alert } from './parts';

// Finding a podcast in the directory (the Find page of the Podcasts tab).

/** Looking for a podcast by name: the results come as you type. */
export function Find() {
  const { items: followed } = useStore(shows.store);
  const term = useStore(podcastUi, (s) => s.term);
  const search = useDebounce(term);
  const [state, setState] = useState({ busy: false, error: '', results: null });
  const asked = useRef(0);
  const input = useRef(null);

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    const words = search.trim();
    const ask = ++asked.current;
    if (words.length < 2) {
      setState({ busy: false, error: '', results: null });
      return;
    }
    setState((now) => ({ ...now, busy: true, error: '' }));
    podcastSearch(words).then(
      (data) => ask === asked.current && setState({ busy: false, error: '', results: data.results }),
      (error) => ask === asked.current && setState({ busy: false, error: error.message, results: null })
    );
  }, [search]);
  const waiting = state.busy || (term.trim().length >= 2 && term !== search);

  const setTerm = (value) => podcastUi.set({ term: value });
  const followToggle = (result) => {
    const id = showId(result.feedUrl);
    if (followed.some((item) => item.id === id)) return shows.remove(id);
    return shows.put({ id, feedUrl: result.feedUrl, title: result.title, author: result.author, image: result.image, createdAt: Date.now(), updatedAt: Date.now() });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2 rounded-2xl border border-line bg-ink-1 p-1.5 pl-4 focus-within:border-signal/60" role="search">
        {waiting ? <LoaderCircle size={16} className="shrink-0 animate-spin text-signal" aria-hidden="true" /> : <Search size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />}
        <input ref={input} type="search" value={term} onChange={(event) => setTerm(event.target.value)} aria-label={tr('Search podcasts')} placeholder={tr('A podcast’s name, like “The Daily” or “Huberman Lab”')} className="h-10 min-w-0 flex-1 bg-transparent text-body text-bone placeholder:text-bone-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden" />
        {term && (
          <button type="button" onClick={() => (setTerm(''), input.current?.focus())} aria-label={tr('Clear')} className="grid size-9 place-items-center rounded-full text-bone-faint hover:bg-wash/10 hover:text-bone">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </form>
      {state.error && <Alert>{state.error}</Alert>}
      {!state.results && !waiting && term.trim().length < 2 && <p className="text-fine text-bone-dim">{tr('Type at least two letters: the results show up as you type.')}</p>}
      {waiting && !state.results && (
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3">
              <Skeleton className="size-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {state.results && state.results.length === 0 && <p className="text-fine text-bone-dim">{tr('No podcast matches that. Try other words.')}</p>}
      {state.results?.length > 0 && (
        <ul className={clsx('flex flex-col gap-2 transition-opacity', waiting && 'opacity-60')} aria-label={tr('Results')}>
          {state.results.map((result) => {
            const following = followed.some((item) => item.id === showId(result.feedUrl));
            return (
              <li key={result.feedUrl} className="flex items-center gap-2 rounded-2xl border border-line bg-ink-1 p-2 pr-3 transition-colors hover:border-line-strong">
                <button type="button" onClick={() => openShow(result)} className="flex min-w-0 flex-1 items-center gap-3 p-1 text-left">
                  <Cover src={result.image} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fine font-medium text-bone">{result.title}</span>
                    <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{[result.author, result.genre].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
                <Button variant={following ? 'secondary' : 'ghost'} size="sm" onClick={() => followToggle(result)} aria-pressed={following}>
                  {following ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />} <span className="max-sm:hidden">{following ? tr('Following') : tr('Follow')}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
