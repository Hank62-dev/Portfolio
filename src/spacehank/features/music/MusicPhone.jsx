import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlus, House, Library, ListMusic, Plus, Search, Shuffle, Trash2, Upload, X } from 'lucide-react';
import { Button, Menu } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { djPick } from '../../core/api/owner';
import { greetingFor, owner } from '../../core/config';
import { useCoverTint } from './Cover';
import { createPlaylist, groupTracks, importFiles, library, loadLibrary, removeSamples } from './library';
import { MOODS, Orbit, matches } from './parts';
import { playList, player, playTrack } from './player';
import { musicUi } from './ui';
import { useSlider } from '../../ui/useSlider';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { GOLD, Vinyl, Heading, TrackRow, CollectionRow, CollectionPage, NowPlaying } from './phone';

/** Songs / Albums / Artists / Playlists as large titles, with an underline that glides to the chosen one. */
function ShelfTitles({ shelf, onPick }) {
  const { ref, marker } = useSlider(shelf, 'h-0.5 rounded-full bg-signal', { fit: 'x' });
  return (
    <div ref={ref} className="relative mx-5 flex gap-6" role="tablist" aria-label={tr('Library shelves')}>
      {marker}
      {SHELVES.map(({ id, label }) => (
        <button key={id} type="button" role="tab" aria-selected={shelf === id} onClick={() => onPick(id)} className={clsx('relative pb-2 font-display text-[1.2rem] transition-colors', shelf === id ? 'text-bone' : 'text-bone-faint')}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Hank Music on a phone. It keeps the shape people know from music apps (Home, Search, Library, a page for each
// collection, a full-screen player) but has a look of its own: the record. Covers are discs that turn while a song
// plays, a collection is a sleeve with its record sliding out, the player is a turntable with a tonearm and a ring
// of progress, and the colours come from the song that is playing, over a warm gold.

const SECTIONS = [
  { id: 'home', label: tr('Home'), icon: House },
  { id: 'search', label: tr('Search'), icon: Search },
  { id: 'library', label: tr('Library'), icon: Library },
];
const SHELVES = [
  { id: 'songs', label: tr('Songs') },
  { id: 'playlists', label: tr('Playlists') },
  { id: 'albums', label: tr('Albums') },
  { id: 'artists', label: tr('Artists') },
];

const hashHue = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);
/** A card's colour: two soft glows on a dark ground, in a hue taken from its name, so each mix has a mood of its own. */
const auroraOf = (text) => {
  const hue = hashHue(text);
  return `radial-gradient(120% 90% at 0% 0%, hsl(${hue} 62% 50% / 0.62), transparent 60%), radial-gradient(100% 100% at 100% 100%, hsl(${(hue + 38) % 360} 56% 44% / 0.5), transparent 64%), hsl(${hue} 28% 11%)`;
};

export default function MusicPhone() {
  const { loaded, tracks, playlists, error } = useStore(library);
  const full = useStore(musicUi, (s) => s.full);
  const nowId = useStore(player, (s) => s.trackId);
  const nowPlaying = useStore(player, (s) => s.playing);
  const [section, setSection] = useState('home');
  const [shelf, setShelf] = useState('songs');
  const [query, setQuery] = useState('');
  const search = useDebounce(query);
  const [page, setPage] = useState(null); // { kind, key }
  const [notice, setNotice] = useState('');
  const [dj, setDj] = useState({ busy: false, note: '', error: '', text: '' });
  const [newPlaylist, setNewPlaylist] = useState(null);
  const filePicker = useRef(null);
  const folderPicker = useRef(null);

  useEffect(() => {
    void loadLibrary();
  }, []);

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const current = nowId ? byId.get(nowId) : null;
  const tint = useCoverTint(current);
  const accent = current?.hasCover ? tint : GOLD;
  const albums = useMemo(() => groupTracks(tracks, 'album').filter((g) => g.key), [tracks]);
  const artists = useMemo(() => groupTracks(tracks, 'artist').filter((g) => g.key), [tracks]);
  const liked = useMemo(() => tracks.filter((t) => t.favorite), [tracks]);
  const of = (g) => g.trackIds.map((id) => byId.get(id)).filter(Boolean);
  const allIds = tracks.map((t) => t.id);
  const empty = loaded && !tracks.length;
  const hasSamples = tracks.some((t) => t.sample);

  const albumItems = albums.map((g) => ({ key: g.key, title: g.title, sub: g.subtitle || tr('Album'), tracks: of(g), open: { kind: 'album', key: g.key } }));
  const artistItems = artists.map((g) => ({ key: g.key, title: g.title, sub: tr('{0} songs', g.trackIds.length), tracks: of(g), open: { kind: 'artist', key: g.key } }));
  const likedItem = { key: 'liked', title: tr('Liked Songs'), sub: tr('{0} songs', liked.length), liked: true, tracks: liked, open: { kind: 'liked' } };
  const playlistItems = playlists.map((p) => ({ key: p.id, title: p.name, sub: tr('{0} songs', p.trackIds.length), tracks: p.trackIds.map((id) => byId.get(id)).filter(Boolean), open: { kind: 'playlist', key: p.id } }));

  const pageData = useMemo(() => {
    if (!page) return null;
    if (page.kind === 'liked') return { title: tr('Liked Songs'), sub: tr('Playlist'), tracks: liked, liked: true };
    if (page.kind === 'album') return { title: page.key, sub: tr('Album'), tracks: tracks.filter((t) => t.album === page.key) };
    if (page.kind === 'artist') return { title: page.key, sub: tr('Artist'), tracks: tracks.filter((t) => t.artist === page.key) };
    const p = playlists.find((x) => x.id === page.key);
    return p ? { title: p.name, sub: tr('Playlist'), tracks: p.trackIds.map((id) => byId.get(id)).filter(Boolean), playlist: p } : null;
  }, [page, tracks, liked, playlists, byId]);

  const recent = useMemo(() => {
    const played = tracks.filter((t) => t.playedAt).sort((a, b) => b.playedAt - a.playedAt);
    return (played.length ? played : tracks).slice(0, 6);
  }, [tracks]);
  const played = tracks.some((t) => t.playedAt);
  const genres = useMemo(() => [...new Set(tracks.map((t) => t.genre).filter(Boolean))], [tracks]);
  const results = useMemo(() => (search.trim() ? tracks.filter((t) => matches(t, search)) : []), [tracks, search]);
  const sectionIndex = SECTIONS.findIndex((s) => s.id === section);

  const add = async (files) => {
    if (!files.length) return;
    setNotice(tr('Reading your files…'));
    const result = await importFiles(files, () => {});
    setNotice([tr('{0} added', result.added), result.skipped && tr('{0} already there', result.skipped), result.failed && tr('{0} could not be read', result.failed)].filter(Boolean).join(' · '));
  };
  const askDj = async (wish) => {
    const text = (wish ?? dj.text).trim();
    if (!text || dj.busy) return;
    setDj({ busy: true, note: '', error: '', text });
    try {
      const pick = await djPick({ mood: text, tracks: tracks.map((t) => ({ id: t.id, title: t.title, artist: t.artist, genre: t.genre })) });
      if (!pick.ids.length) throw new Error(tr('Nothing in your library fits that. Try other words.'));
      await playList(pick.ids);
      setDj({ busy: false, note: pick.note, error: '', text });
    } catch (e) {
      setDj({ busy: false, note: '', error: e.message, text });
    }
  };
  const createList = async (event) => {
    event.preventDefault();
    if (!newPlaylist?.trim()) return;
    const p = await createPlaylist(newPlaylist);
    setNewPlaylist(null);
    setShelf('playlists');
    setSection('library');
    setPage({ kind: 'playlist', key: p.id });
  };

  const libraryItems = shelf === 'albums' ? albumItems : shelf === 'artists' ? artistItems : shelf === 'playlists' ? [likedItem, ...playlistItems] : null;

  return (
    <div className="relative isolate -mx-5 flex flex-col gap-7 pb-4" data-music-phone>
      {/* the light of the room: gold, or the colour of the song that is playing */}
      <div className="pointer-events-none absolute inset-x-0 -top-28 -z-10 h-[34rem] overflow-hidden [mask-image:linear-gradient(#000_55%,transparent)]" aria-hidden="true">
        <i className="room-blob absolute -top-20 -left-16 size-80 animate-[drift_22s_ease-in-out_infinite] rounded-full blur-[84px] transition-colors duration-1000" style={{ background: `rgb(${accent} / ${nowPlaying ? 0.42 : 0.3})` }} />
        <i className="room-blob absolute top-24 -right-24 size-72 animate-[drift_28s_ease-in-out_infinite_reverse] rounded-full blur-[96px]" style={{ background: 'hsl(var(--app-hue) 80% 58% / 0.18)' }} />
      </div>

      <input ref={filePicker} type="file" multiple accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.lrc" hidden data-file-input onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />
      <input ref={folderPicker} type="file" multiple webkitdirectory="" hidden onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />

      {/* Home, Search, Library on a glass bar with a gold marker that slides, and adding music */}
      <div className="flex items-center gap-2.5 px-5">
        <div className="relative grid flex-1 grid-cols-3 rounded-full border border-wash/10 bg-wash/[0.05] p-1 backdrop-blur" role="tablist" aria-label={tr('Music')}>
          <i className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-signal shadow-[0_8px_22px_-8px_var(--color-signal)] transition-transform duration-500 ease-out-expo" style={{ transform: `translateX(${sectionIndex * 100}%)` }} aria-hidden="true" />
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)} className={clsx('relative z-10 inline-flex h-10 items-center justify-center gap-1.5 rounded-full font-mono text-[0.76rem] transition-colors duration-300', section === id ? 'font-medium text-ink-0' : 'text-bone-dim')}>
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <Menu
          align="end"
          trigger={
            <button type="button" aria-label={tr('Add music')} className="grid size-12 shrink-0 place-items-center rounded-full border border-signal/50 bg-signal-soft text-signal active:scale-90">
              <Plus size={20} aria-hidden="true" />
            </button>
          }
          items={[
            { id: 'songs', label: tr('Add songs'), icon: Upload, onSelect: () => filePicker.current?.click() },
            { id: 'folder', label: tr('Add a folder'), icon: FolderPlus, onSelect: () => folderPicker.current?.click() },
            { id: 'playlist', label: tr('New playlist'), icon: ListMusic, onSelect: () => { setSection('library'); setShelf('playlists'); setNewPlaylist(''); } },
            ...(hasSamples ? [{ id: 'rm', label: tr('Remove the sample songs'), icon: Trash2, onSelect: () => removeSamples() }] : []),
          ]}
        />
      </div>
      {(notice || error) && (
        <p className="-mt-3 px-5 font-mono text-fine text-bone-dim" role="status">
          {error || notice}
        </p>
      )}

      {empty && (
        <section className="mx-5 flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-line-strong p-8 text-center">
          <Vinyl spinning={false} className="w-40" />
          <h2 className="font-display text-h3 leading-tight text-bone">{tr('The turntable is')} <em className="serif-accent">{tr('quiet')}</em></h2>
          <p className="text-fine text-bone-dim">{tr('Add songs from this phone, or drop files into')} <code className="font-mono text-[0.78rem]">{tr('src/assets/music')}</code> {tr('in the project. Tags and covers are read from the files, and everything stays on this device.')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => filePicker.current?.click()}>
              {tr('Add songs')}
            </Button>
          </div>
        </section>
      )}

      {!empty && section === 'home' && (
        <>
          <div className="px-5">
            <span className="block font-mono text-[0.6rem] tracking-[0.24em] text-signal uppercase">{greetingFor(new Date().getHours())}</span>
            <h2 className="mt-2 font-display text-[2.1rem] leading-[1.02] text-bone">
              {tr('What shall we')} <em className="serif-accent">{tr('spin')}</em>, {owner.name}?
            </h2>
          </div>

          <ul className="grid grid-cols-2 gap-2 px-5" aria-label={tr('Quick picks')}>
            {[likedItem, ...playlistItems, ...albumItems].slice(0, 6).map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => setPage(item.open)} className="flex h-14 w-full items-center gap-2.5 rounded-full border border-wash/10 bg-wash/[0.06] p-1 pr-3.5 text-left backdrop-blur active:scale-[0.97]">
                  <Orbit tracks={item.tracks} liked={item.liked} className="size-12 ring-1 ring-wash/15" />
                  <b className="line-clamp-2 min-w-0 font-display text-[0.92rem] leading-[1.1] font-normal text-bone">{item.title}</b>
                </button>
              </li>
            ))}
          </ul>

          <section className="flex flex-col gap-4" aria-label={played ? tr('Recently played') : tr('Your songs')}>
            <Heading eyebrow={played ? tr('On rotation') : tr('Your shelf')}>
              {played ? (
                <>
                  {tr('Recently')} <em className="serif-accent">{tr('played')}</em>
                </>
              ) : (
                <>
                  {tr('Your')} <em className="serif-accent">{tr('songs')}</em>
                </>
              )}
            </Heading>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 px-5">
              {recent.map((t) => {
                const isNow = nowId === t.id;
                return (
                  <li key={t.id} data-track={t.title}>
                    <button type="button" onClick={() => playTrack(t.id, allIds)} aria-label={tr('Play {0}', t.title)} className="block w-full text-center active:scale-95">
                      <Vinyl track={t} spinning={isNow && nowPlaying} className="w-full" tint={accent} />
                      <b className={clsx('mt-1.5 block truncate font-display text-[0.95rem] font-normal', isNow ? 'text-signal' : 'text-bone')}>{t.title}</b>
                      <small className="block truncate font-mono text-[0.62rem] text-bone-faint">{t.artist || tr('Unknown artist')}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-4" aria-label={tr('Made for you')}>
            <Heading eyebrow={tr('Hank DJ')} action={dj.busy ? <span className="font-mono text-[0.66rem] text-signal">{tr('mixing…')}</span> : null}>
              {tr('Made for')} <em className="serif-accent">{tr('you')}</em>
            </Heading>
            <ul className="grid grid-cols-2 gap-3 px-5">
              {MOODS.map((m, i) => (
                <li key={m} className={clsx(i % 2 === 1 && 'mt-5')}>
                  <button type="button" onClick={() => void askDj(m)} className="relative flex h-28 w-full flex-col justify-between overflow-hidden rounded-[1.5rem] border border-wash/10 p-3.5 text-left active:scale-[0.97]" style={{ background: auroraOf(m) }}>
                    <span className="font-mono text-[0.56rem] tracking-[0.22em] text-white/70 uppercase">{tr('Mix')}</span>
                    <b className="font-display text-[1.45rem] leading-none font-normal text-white italic">{m}</b>
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); void askDj(); }} className="mx-5 mt-3 flex gap-2">
              <input aria-label={tr('Tell Hank DJ what to play')} placeholder={tr('or say it in your own words…')} value={dj.text} onChange={(e) => setDj({ ...dj, text: e.target.value })} className="h-12 min-w-0 flex-1 rounded-full border border-wash/12 bg-wash/[0.06] px-5 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" loading={dj.busy} disabled={!dj.text.trim()} className="h-12">
                {tr('Play')}
              </Button>
            </form>
            {(dj.note || dj.error) && <p className={clsx('px-5 font-mono text-fine', dj.error ? 'text-danger' : 'text-bone-dim')} role="status">{dj.error || dj.note}</p>}
          </section>

          {albumItems.length > 0 && (
            <section className="flex flex-col gap-4" aria-label={tr('Your albums')}>
              <Heading eyebrow={tr('Sleeves')}>
                {tr('Your')} <em className="serif-accent">{tr('albums')}</em>
              </Heading>
              <ul className="grid grid-cols-3 gap-3 px-5">
                {albumItems.map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => setPage(item.open)} aria-label={tr('Open {0}', item.title)} className="block w-full text-left active:scale-95">
                      <Orbit tracks={item.tracks} className="w-full rounded-xl! shadow-[0_18px_34px_-16px_rgb(var(--shadow-rgb)/0.9)] ring-1 ring-wash/10" />
                      <b className="mt-2 block truncate font-display text-[0.95rem] font-normal text-bone">{item.title}</b>
                      <small className="block truncate font-mono text-[0.62rem] text-bone-faint">{item.sub}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {!empty && section === 'search' && (
        <>
          <label className="relative mx-5 block">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-signal" aria-hidden="true" />
            <input type="search" aria-label={tr('Search the library')} data-own-clear placeholder={tr('Songs, artists, albums…')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-13 w-full rounded-full border border-wash/12 bg-wash/[0.07] pr-11 pl-13 text-body text-bone backdrop-blur placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
            {query && (
              <button type="button" aria-label={tr('Clear the search')} onClick={() => setQuery('')} className="absolute top-1/2 right-4 -translate-y-1/2 text-bone-dim">
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </label>
          {query.trim() ? (
            <section aria-label={tr('Results')}>
              {results.length ? (
                <ul>
                  {results.map((t) => (
                    <TrackRow key={t.id} track={t} ids={results.map((r) => r.id)} />
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 font-mono text-fine text-bone-faint">{tr('Nothing matches “')}{search.trim()}”.</p>
              )}
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <Heading eyebrow={tr('Browse')}>
                {tr('Every')} <em className="serif-accent">{tr('mood')}</em>
              </Heading>
              <ul className="grid grid-cols-2 gap-3 px-5">
                {[...genres, ...MOODS].map((name, i) => (
                  <li key={name} className={clsx(i % 2 === 1 && 'mt-4')}>
                    <button type="button" onClick={() => (genres.includes(name) ? setQuery(name) : void askDj(name))} className="relative flex h-24 w-full items-end overflow-hidden rounded-[1.5rem] border border-wash/10 p-3.5 text-left active:scale-[0.97]" style={{ background: auroraOf(name) }}>
                      <b className="font-display text-[1.3rem] leading-none font-normal text-white capitalize italic">{name}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {!empty && section === 'library' && (
        <>
          <ShelfTitles shelf={shelf} onPick={setShelf} />
          {shelf === 'songs' && (
            <div className="-mb-3 flex items-center gap-3 px-5">
              <button type="button" aria-label={tr('Shuffle play')} onClick={() => void playList(allIds, { shuffle: true })} className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_10px_24px_-10px_var(--color-signal)] active:scale-95">
                <Shuffle size={19} aria-hidden="true" />
              </button>
              <span className="leading-tight">
                <b className="block font-display text-[1.1rem] font-normal text-bone">{tr('Shuffle play')}</b>
                <small className="font-mono text-[0.68rem] text-bone-faint">{tracks.length} {tr('songs')}</small>
              </span>
            </div>
          )}
          {newPlaylist !== null && (
            <form onSubmit={createList} className="mx-5 flex gap-2">
              <input autoFocus aria-label={tr('New playlist name')} placeholder={tr('Name the playlist')} value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setNewPlaylist(null)} className="h-12 min-w-0 flex-1 rounded-full border border-wash/12 bg-wash/[0.06] px-5 text-fine text-bone focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" disabled={!newPlaylist.trim()} className="h-12">
                {tr('Create')}
              </Button>
            </form>
          )}
          <ul className="-mt-3 flex flex-col" aria-label={SHELVES.find((s) => s.id === shelf)?.label}>
            {shelf === 'playlists' && (
              <li className="px-3">
                <button type="button" onClick={() => setNewPlaylist('')} className="flex w-full items-center gap-3.5 rounded-2xl px-2 py-1.5 text-left active:bg-wash/6">
                  <span className="grid size-[3.2rem] shrink-0 place-items-center rounded-xl border border-dashed border-signal/60 text-signal">
                    <Plus size={22} aria-hidden="true" />
                  </span>
                  <b className="font-display text-[1.08rem] font-normal text-bone">{tr('New playlist')}</b>
                </button>
              </li>
            )}
            {libraryItems
              ? libraryItems.map((item) => <CollectionRow key={item.key} item={item} onOpen={setPage} />)
              : tracks.map((t) => <TrackRow key={t.id} track={t} ids={allIds} />)}
          </ul>
        </>
      )}

      {pageData && <CollectionPage data={pageData} playlists={playlists} onClose={() => setPage(null)} onDeleted={() => setPage(null)} />}
      {full && <NowPlaying tracks={tracks} byId={byId} />}
    </div>
  );
}
