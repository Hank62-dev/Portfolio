import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Play, Plus, Search, X } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { Segmented } from '../../ui/Page';
import { Cover } from './Controls';
import { knownFeed, loadFeed } from './feeds';
import { playEpisode } from './player';
import { filterEpisodes, progressOf, showId } from './model';
import { listens, shows } from './store';
import { openShow } from './ui';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { Alert, Episode, EpisodeSkeletons, PAGE } from './parts';

// A podcast's own page in the Podcasts tab: its cover, what it is about, and its episodes, a page at a time.

/** A show: its details, follow or leave, play the newest, and its episodes (filtered, searched, a page at a time). */
export function ShowPage({ entry }) {
  const { items: followed } = useStore(shows.store);
  const { items: heard } = useStore(listens.store);
  const cached = knownFeed(entry.feedUrl);
  const [state, setState] = useState({ loading: !cached, error: '', data: cached });
  const [only, setOnly] = useState('all');
  const [term, setTerm] = useState('');
  const search = useDebounce(term);
  const [count, setCount] = useState(PAGE);
  const [more, setMore] = useState(false);
  const id = showId(entry.feedUrl);
  const following = followed.some((item) => item.id === id);

  useEffect(() => {
    let live = true;
    window.scrollTo?.({ top: 0 });
    loadFeed(entry.feedUrl).then(
      (data) => live && setState({ loading: false, error: '', data }),
      (error) => live && setState((now) => ({ loading: false, error: error.message, data: now.data }))
    );
    return () => {
      live = false;
    };
  }, [entry.feedUrl]);

  const details = { ...entry, ...(state.data?.show ?? {}), id };
  const show = { id, feedUrl: entry.feedUrl, title: details.title, image: details.image };
  const follow = () => shows.put({ id, feedUrl: entry.feedUrl, title: details.title, author: details.author, image: details.image, createdAt: Date.now(), updatedAt: Date.now() });
  const episodes = useMemo(() => state.data?.episodes ?? [], [state.data]);
  const list = useMemo(() => filterEpisodes(episodes, heard, id, { only, term: search }), [episodes, heard, id, only, search]);
  const unheard = episodes.filter((episode) => !progressOf(heard, id, episode.guid)?.done).length;

  // the one button that matters most: carry on with what was left half-heard, else the newest not heard yet
  const half = episodes.find((episode) => {
    const record = progressOf(heard, id, episode.guid);
    return record && !record.done && record.position >= 15;
  });
  const nextUp = half ?? episodes.find((episode) => !progressOf(heard, id, episode.guid)?.done);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" onClick={() => openShow(null)}>
          <ChevronLeft size={14} aria-hidden="true" /> {tr('Podcasts')}
        </Button>
      </div>
      <header className="flex items-start gap-4 sm:gap-5">
        <Cover src={details.image} size={128} className="rounded-2xl shadow-xl max-sm:!size-24" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-h3 leading-tight text-bone">{details.title}</h2>
          {details.author && <p className="mt-1 text-fine text-bone-dim">{details.author}</p>}
          {episodes.length > 0 && <p className="mt-1 font-mono text-[0.7rem] text-bone-faint">{tr('{0} episodes · {1} not heard', episodes.length, unheard)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {nextUp && (
              <Button size="sm" onClick={() => playEpisode(show, nextUp)}>
                <Play size={14} fill="currentColor" aria-hidden="true" /> {half ? tr('Continue listening') : tr('Play the newest')}
              </Button>
            )}
            {following ? (
              <Button variant="secondary" size="sm" onClick={() => shows.remove(id)} title={tr('Stop following')}>
                <Check size={14} aria-hidden="true" /> {tr('Following')}
              </Button>
            ) : (
              <Button variant={nextUp ? 'secondary' : 'primary'} size="sm" onClick={follow}>
                <Plus size={14} aria-hidden="true" /> {tr('Follow')}
              </Button>
            )}
          </div>
        </div>
      </header>
      {details.description && (
        <div className="max-w-[70ch]">
          <p className={clsx('text-fine leading-relaxed text-bone-dim', !more && 'line-clamp-3')}>{details.description}</p>
          {details.description.length > 180 && (
            <button type="button" onClick={() => setMore(!more)} className="mt-1 font-mono text-[0.72rem] text-signal hover:underline">
              {more ? tr('Show less') : tr('Read more')}
            </button>
          )}
        </div>
      )}
      {state.error && <Alert>{state.error}</Alert>}
      {state.loading && <EpisodeSkeletons />}
      {state.data && episodes.length === 0 && <p className="text-fine text-bone-dim">{tr('This podcast has no episodes that can be played here.')}</p>}
      {episodes.length > 0 && (
        <section aria-label={tr('Episodes')} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label={tr('Episodes')}
              value={only}
              onChange={(value) => {
                setOnly(value);
                setCount(PAGE);
              }}
              options={[
                { id: 'all', label: tr('All ({0})', episodes.length) },
                { id: 'new', label: tr('Not heard ({0})', unheard) },
              ]}
              round
            />
            {episodes.length > 8 && (
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-ink-1 px-3 focus-within:border-signal/60 sm:max-w-xs">
                <Search size={14} className="shrink-0 text-bone-faint" aria-hidden="true" />
                <input
                  value={term}
                  onChange={(event) => {
                    setTerm(event.target.value);
                    setCount(PAGE);
                  }}
                  aria-label={tr('Search the episodes')}
                  placeholder={tr('Search the episodes')}
                  className="min-w-0 flex-1 bg-transparent text-fine text-bone placeholder:text-bone-faint focus-visible:outline-none"
                />
                {term && (
                  <button type="button" onClick={() => setTerm('')} aria-label={tr('Clear')} className="text-bone-faint hover:text-bone">
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>
            )}
          </div>
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-fine text-bone-dim">{search ? tr('No episode has that in its title.') : tr('You have heard every episode.')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {list.slice(0, count).map((episode) => (
                <Episode key={episode.guid} show={show} episode={episode} record={progressOf(heard, id, episode.guid)} />
              ))}
            </ul>
          )}
          {list.length > count && (
            <Button variant="ghost" size="sm" className="self-center" onClick={() => setCount(count + PAGE)}>
              {tr('Show {0} more', Math.min(PAGE, list.length - count))}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
