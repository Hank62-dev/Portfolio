import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AudioLines,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Heart,
  House,
  Library,
  ListMusic,
  MoonStar,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button, Menu } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { djPick } from '../api/owner';
import { greetingFor } from '../config';
import Cover, { useCoverTint } from '../music/Cover';
import { activeLine, parseLrc } from '../music/lrc';
import {
  addSamples,
  createPlaylist,
  deletePlaylist,
  formatTime,
  groupTracks,
  importFiles,
  library,
  loadLibrary,
  removeSamples,
  setLyrics,
  toggleFavorite,
} from '../music/library';
import { MOODS, Orbit, Ribbon, SheetRow, Slider, matches } from '../music/parts';
import { cycleRepeat, next, playList, player, playTrack, previous, seek, setSleepTimer, toggleShuffle, togglePlay } from '../music/player';
import { closePlayer, musicUi } from '../music/ui';
import { useStore } from '../store';

// Hank Music as a phone app, after the usual music apps: Home, Search and Library, a page for every album or playlist,
// and a full-screen player. The desktop room (MusicView) stays as it is.

const SECTIONS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: Library },
];
const SHELVES = [
  { id: 'songs', label: 'Songs' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
];

const hashHue = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);
const tileBackground = (text) => {
  const hue = hashHue(text);
  return `linear-gradient(145deg, hsl(${hue} 68% 46%), hsl(${(hue + 50) % 360} 62% 28%))`;
};

/**
 * A layer above the screen that takes a history entry of its own: the phone's Back button closes the layer and leaves
 * the screen underneath as it was. Layers can stack (a page, then the player over it).
 */
function useHistoryLayer(open, close) {
  const navigate = useNavigate();
  const location = useLocation();
  const key = useRef(`layer-${Math.random().toString(36).slice(2)}`);
  const pushed = useRef(false);
  const armed = useRef(false);

  useEffect(() => {
    if (open && !pushed.current) {
      pushed.current = true;
      navigate(`${location.pathname}${location.search}`, { state: { layers: [...(location.state?.layers ?? []), key.current] } });
    }
    if (!open) pushed.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the layer opens or closes
  }, [open]);

  useEffect(() => {
    if (location.state?.layers?.includes(key.current)) armed.current = true;
    else if (armed.current && open) {
      armed.current = false;
      close();
    }
  }, [open, location]); // eslint-disable-line react-hooks/exhaustive-deps -- `close` is only a setter

  return () => (armed.current ? navigate(-1) : close());
}

const Layer = ({ children }) => createPortal(children, document.querySelector('.app-shell') ?? document.body);

/** One song as a list row: cover, title and artist, a heart. Tapping plays it with `ids` as the queue. */
function TrackRow({ track, ids }) {
  const current = useStore(player, (s) => s.trackId === track.id);
  const playing = useStore(player, (s) => s.trackId === track.id && s.playing);
  return (
    <li className="flex items-center px-3" data-track={track.title}>
      <button type="button" onClick={() => (current ? togglePlay() : playTrack(track.id, ids))} aria-label={`${current && playing ? 'Pause' : 'Play'} ${track.title}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-white/6">
        <Cover track={track} className="size-12 shrink-0" rounded="rounded-lg" />
        <span className="min-w-0 flex-1 leading-tight">
          <b className={clsx('block truncate text-fine font-medium', current ? 'text-signal' : 'text-bone')}>{track.title}</b>
          <small className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.7rem] text-bone-faint">
            {current && playing && <AudioLines size={12} className="shrink-0 text-signal" aria-hidden="true" />}
            <span className="truncate">{track.artist || 'Unknown artist'}</span>
          </small>
        </span>
      </button>
      <button type="button" aria-label={track.favorite ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`} aria-pressed={track.favorite} onClick={() => toggleFavorite(track.id)} className={clsx('grid size-11 shrink-0 place-items-center rounded-full active:scale-90', track.favorite ? 'text-signal' : 'text-bone-faint')}>
        <Heart size={18} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </li>
  );
}

/** A collection (album, artist, playlist, liked songs) as a row: its picture, name and what it holds. */
function CollectionRow({ item, onOpen }) {
  return (
    <li className="px-3">
      <button type="button" onClick={() => onOpen(item.open)} aria-label={`Open ${item.title}`} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-white/6">
        <Orbit tracks={item.tracks} liked={item.liked} className="size-12 shrink-0 rounded-lg!" />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-fine font-medium text-bone">{item.title}</b>
          <small className="font-mono text-[0.7rem] text-bone-faint">{item.sub}</small>
        </span>
        <ChevronRight size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />
      </button>
    </li>
  );
}

const Section = ({ title, children, action }) => (
  <section className="flex flex-col gap-3 px-5">
    <div className="flex items-end justify-between">
      <h2 className="font-display text-[1.35rem] leading-none text-bone">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

/** The page of an album, artist or playlist: a big picture, play and shuffle, then the songs. */
function CollectionPage({ data, playlists, onClose, onDeleted }) {
  const leave = useHistoryLayer(true, onClose);
  const tint = useCoverTint(data.tracks[0]);
  const ids = data.tracks.map((t) => t.id);
  return (
    <Layer>
      <div className="fixed inset-0 z-[25] animate-sheet-up overflow-y-auto overscroll-contain bg-ink-0 pb-48" style={{ backgroundImage: `linear-gradient(180deg, rgb(${tint} / 0.55), transparent 22rem)` }} data-collection-page>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
          <button type="button" aria-label="Back" onClick={leave} className="grid size-10 place-items-center rounded-full bg-black/35 text-bone backdrop-blur active:scale-90">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          {data.playlist && (
            <Menu
              align="end"
              trigger={
                <button type="button" aria-label="More" className="grid size-10 place-items-center rounded-full bg-black/35 text-bone backdrop-blur active:scale-90">
                  <MoreHorizontal size={20} aria-hidden="true" />
                </button>
              }
              items={[{ id: 'del', label: 'Delete this playlist', icon: Trash2, onSelect: () => { void deletePlaylist(data.playlist.id); onDeleted(); } }]}
            />
          )}
        </div>

        <div className="mx-auto mt-2 flex w-[min(15rem,66vw)] flex-col items-center">
          <Orbit tracks={data.tracks} liked={data.liked} className="w-full rounded-xl! shadow-[0_30px_60px_-24px_rgb(0_0_0/0.9)]" />
        </div>
        <div className="px-5 pt-5">
          <span className="font-mono text-[0.66rem] tracking-[0.16em] text-bone-faint uppercase">{data.sub ?? 'Library'}</span>
          <h1 className="mt-1 font-display text-[2rem] leading-[1.05] text-bone">{data.title}</h1>
          <p className="mt-1 font-mono text-[0.72rem] text-bone-faint">{data.tracks.length} songs</p>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" aria-label="Shuffle play" disabled={!ids.length} onClick={() => void playList(ids, { shuffle: true })} className="grid size-11 place-items-center rounded-full border border-white/15 text-bone-dim active:scale-90 disabled:opacity-40">
              <Shuffle size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Play all" disabled={!ids.length} onClick={() => void playList(ids)} className="ml-auto grid size-14 place-items-center rounded-full bg-signal text-ink-0 shadow-[0_12px_28px_-10px_var(--color-signal)] active:scale-95 disabled:opacity-40">
              <Play size={24} fill="currentColor" className="translate-x-px" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ul className="mt-3 px-2" aria-label="Songs">
          {data.tracks.length ? (
            data.tracks.map((track, i) => <SheetRow key={track.id} track={track} index={i} ids={ids} playlists={playlists} inPlaylist={Boolean(data.playlist)} onRemoveFromPlaylist={() => {}} />)
          ) : (
            <li className="px-4 py-8 text-center font-mono text-fine text-bone-faint">Nothing here yet.</li>
          )}
        </ul>
      </div>
    </Layer>
  );
}

/** The full-screen player: the cover large, the song, the progress, the controls, then lyrics and what is next. */
function NowPlaying({ tracks, byId }) {
  const { trackId, playing, loading, time, duration, shuffle, repeat, sleepAt, queue, error } = useStore(player);
  const current = tracks.find((t) => t.id === trackId) ?? null;
  const tint = useCoverTint(current);
  const lyricsInput = useRef(null);
  const leave = useHistoryLayer(true, closePlayer);
  const lines = useMemo(() => parseLrc(current?.lyrics), [current?.lyrics]);
  const active = activeLine(lines, time);
  const upNext = queue.order.slice(queue.index + 1, queue.index + 6).map((id) => byId.get(id)).filter(Boolean);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  return (
    <Layer>
      <div className="fixed inset-0 z-[60] animate-sheet-up overflow-x-hidden overflow-y-auto overscroll-contain px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-10" style={{ background: `linear-gradient(180deg, rgb(${tint} / 0.65), transparent 70%), var(--color-ink-0)` }} data-now-playing-page>
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Close the player" onClick={leave} className="grid size-10 place-items-center rounded-full bg-white/10 text-bone active:scale-90">
            <ChevronDown size={22} aria-hidden="true" />
          </button>
          <span className="font-mono text-[0.66rem] tracking-[0.16em] text-bone-dim uppercase">Now playing</span>
          <Menu
            align="end"
            trigger={
              <button type="button" aria-label="Sleep timer" className={clsx('grid size-10 place-items-center rounded-full bg-white/10 active:scale-90', sleepAt ? 'text-signal' : 'text-bone')}>
                <MoonStar size={18} aria-hidden="true" />
              </button>
            }
            items={[...[15, 30, 60].map((m) => ({ id: `s${m}`, label: `Stop after ${m} min`, onSelect: () => setSleepTimer(m) })), { id: 'off', label: 'No sleep timer', onSelect: () => setSleepTimer(0) }]}
          />
        </div>

        <div className="mx-auto mt-6 w-full max-w-[22rem]">
          <Cover track={current} className="aspect-square w-full shadow-[0_34px_70px_-26px_rgb(0_0_0/0.95)]" rounded="rounded-2xl" />
        </div>

        <div className="mx-auto mt-7 flex w-full max-w-[22rem] items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate font-display text-[1.7rem] text-bone" data-now-title>
              {current?.title ?? 'Nothing playing'}
            </h2>
            <p className="mt-1 truncate text-fine text-bone-dim">{current ? [current.artist, current.album].filter(Boolean).join(' · ') || 'Unknown artist' : 'Pick a song from the library'}</p>
          </div>
          {current && (
            <button type="button" aria-label={current.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={current.favorite} onClick={() => toggleFavorite(current.id)} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', current.favorite ? 'text-signal' : 'text-bone-dim')}>
              <Heart size={24} fill={current.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mx-auto mt-4 w-full max-w-[22rem]">
          <Slider label="Seek" value={Math.floor(time)} max={Math.max(1, Math.floor(duration))} onChange={seek} className="w-full" />
          <div className="mt-1 flex justify-between font-mono text-[0.68rem] text-bone-faint tabular-nums">
            <span>{formatTime(time)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-[22rem] items-center justify-between">
          <button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', shuffle ? 'text-signal' : 'text-bone-dim')}>
            <Shuffle size={20} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Previous track" onClick={previous} className="grid size-12 place-items-center rounded-full text-bone active:scale-90">
            <SkipBack size={28} fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay} className={clsx('grid size-[4.5rem] place-items-center rounded-full bg-bone text-ink-0 shadow-[0_16px_34px_-12px_rgb(0_0_0/0.8)] active:scale-95', loading && 'animate-pulse')}>
            {playing ? <Pause size={30} fill="currentColor" aria-hidden="true" /> : <Play size={30} fill="currentColor" className="translate-x-0.5" aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Next track" onClick={next} className="grid size-12 place-items-center rounded-full text-bone active:scale-90">
            <SkipForward size={28} fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', repeat !== 'off' ? 'text-signal' : 'text-bone-dim')}>
            <RepeatIcon size={20} aria-hidden="true" />
          </button>
        </div>
        {error && <p className="mt-3 text-center font-mono text-fine text-danger">{error}</p>}

        {current && (
          <section className="mx-auto mt-8 w-full max-w-[22rem] rounded-3xl bg-black/25 p-4 backdrop-blur" aria-label="Lyrics">
            <h3 className="font-mono text-[0.66rem] tracking-[0.16em] text-bone-dim uppercase">Lyrics</h3>
            {lines.length ? (
              <Ribbon lines={lines} active={active} />
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-fine text-bone-dim">No lyrics for this one.</p>
                <Button variant="ghost" size="sm" onClick={() => lyricsInput.current?.click()}>
                  Add .lrc
                </Button>
              </div>
            )}
            <input ref={lyricsInput} type="file" accept=".lrc,text/plain" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (file && current) await setLyrics(current.id, await file.text()); e.target.value = ''; }} />
          </section>
        )}

        {upNext.length > 0 && (
          <section className="mx-auto mt-6 w-full max-w-[22rem]" aria-label="Next in queue">
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.16em] text-bone-dim uppercase">
              <ListMusic size={13} aria-hidden="true" /> Next in queue
            </h3>
            <ul>
              {upNext.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => playTrack(t.id, queue.order)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left active:bg-white/8">
                    <Cover track={t} className="size-11" rounded="rounded-lg" />
                    <span className="min-w-0 leading-tight">
                      <b className="block truncate text-fine font-medium text-bone">{t.title}</b>
                      <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{t.artist || 'Unknown artist'}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layer>
  );
}

export default function MusicPhone() {
  const { loaded, tracks, playlists, error } = useStore(library);
  const full = useStore(musicUi, (s) => s.full);
  const [section, setSection] = useState('home');
  const [shelf, setShelf] = useState('songs');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(null); // { kind, key }
  const [notice, setNotice] = useState('');
  const [dj, setDj] = useState({ busy: false, note: '', error: '', text: '' });
  const [newPlaylist, setNewPlaylist] = useState(null);
  const [sampling, setSampling] = useState(false);
  const filePicker = useRef(null);
  const folderPicker = useRef(null);

  useEffect(() => {
    void loadLibrary();
  }, []);

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const albums = useMemo(() => groupTracks(tracks, 'album').filter((g) => g.key), [tracks]);
  const artists = useMemo(() => groupTracks(tracks, 'artist').filter((g) => g.key), [tracks]);
  const liked = useMemo(() => tracks.filter((t) => t.favorite), [tracks]);
  const of = (g) => g.trackIds.map((id) => byId.get(id)).filter(Boolean);
  const allIds = tracks.map((t) => t.id);
  const empty = loaded && !tracks.length;
  const hasSamples = tracks.some((t) => t.sample);

  const albumItems = albums.map((g) => ({ key: g.key, title: g.title, sub: g.subtitle || 'Album', tracks: of(g), open: { kind: 'album', key: g.key } }));
  const artistItems = artists.map((g) => ({ key: g.key, title: g.title, sub: `${g.trackIds.length} songs`, tracks: of(g), open: { kind: 'artist', key: g.key } }));
  const likedItem = { key: 'liked', title: 'Liked Songs', sub: `${liked.length} songs`, liked: true, tracks: liked, open: { kind: 'liked' } };
  const playlistItems = playlists.map((p) => ({ key: p.id, title: p.name, sub: `${p.trackIds.length} songs`, tracks: p.trackIds.map((id) => byId.get(id)).filter(Boolean), open: { kind: 'playlist', key: p.id } }));

  const pageData = useMemo(() => {
    if (!page) return null;
    if (page.kind === 'liked') return { title: 'Liked Songs', sub: 'Playlist', tracks: liked, liked: true };
    if (page.kind === 'album') return { title: page.key, sub: 'Album', tracks: tracks.filter((t) => t.album === page.key) };
    if (page.kind === 'artist') return { title: page.key, sub: 'Artist', tracks: tracks.filter((t) => t.artist === page.key) };
    const p = playlists.find((x) => x.id === page.key);
    return p ? { title: p.name, sub: 'Playlist', tracks: p.trackIds.map((id) => byId.get(id)).filter(Boolean), playlist: p } : null;
  }, [page, tracks, liked, playlists, byId]);

  const recent = useMemo(() => {
    const played = tracks.filter((t) => t.playedAt).sort((a, b) => b.playedAt - a.playedAt);
    return (played.length ? played : tracks).slice(0, 6);
  }, [tracks]);
  const played = tracks.some((t) => t.playedAt);
  const genres = useMemo(() => [...new Set(tracks.map((t) => t.genre).filter(Boolean))], [tracks]);
  const results = useMemo(() => (query.trim() ? tracks.filter((t) => matches(t, query)) : []), [tracks, query]);

  const add = async (files) => {
    if (!files.length) return;
    setNotice('Reading your files…');
    const result = await importFiles(files, () => {});
    setNotice([`${result.added} added`, result.skipped && `${result.skipped} already there`, result.failed && `${result.failed} could not be read`].filter(Boolean).join(' · '));
  };
  const trySamples = async () => {
    setSampling(true);
    const added = await addSamples();
    setSampling(false);
    setNotice(added ? `${added} sample songs added` : 'The sample songs are already here');
  };
  const askDj = async (wish) => {
    const text = (wish ?? dj.text).trim();
    if (!text || dj.busy) return;
    setDj({ busy: true, note: '', error: '', text });
    try {
      const pick = await djPick({ mood: text, tracks: tracks.map((t) => ({ id: t.id, title: t.title, artist: t.artist, genre: t.genre })) });
      if (!pick.ids.length) throw new Error('Nothing in your library fits that. Try other words.');
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
    <div className="-mx-5 flex flex-col gap-6 pb-4" data-music-phone>
      <input ref={filePicker} type="file" multiple accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.lrc" hidden data-file-input onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />
      <input ref={folderPicker} type="file" multiple webkitdirectory="" hidden onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />

      {/* Home / Search / Library, and adding music */}
      <div className="flex items-center gap-2 px-5">
        <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Music">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)} className={clsx('inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 font-mono text-[0.78rem] transition-colors active:scale-95', section === id ? 'bg-signal text-ink-0' : 'bg-white/8 text-bone-dim')}>
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <Menu
          align="end"
          trigger={
            <button type="button" aria-label="Add music" className="grid size-10 place-items-center rounded-full bg-bone text-ink-0 active:scale-90">
              <Plus size={19} aria-hidden="true" />
            </button>
          }
          items={[
            { id: 'songs', label: 'Add songs', icon: Upload, onSelect: () => filePicker.current?.click() },
            { id: 'folder', label: 'Add a folder', icon: FolderPlus, onSelect: () => folderPicker.current?.click() },
            { id: 'playlist', label: 'New playlist', icon: ListMusic, onSelect: () => { setSection('library'); setShelf('playlists'); setNewPlaylist(''); } },
            hasSamples ? { id: 'rm', label: 'Remove the sample songs', icon: Trash2, onSelect: () => removeSamples() } : { id: 'samples', label: 'Add sample songs', icon: Sparkles, onSelect: trySamples },
          ]}
        />
      </div>
      {(notice || error) && (
        <p className="-mt-3 px-5 font-mono text-fine text-bone-dim" role="status">
          {error || notice}
        </p>
      )}

      {empty && (
        <section className="mx-5 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-signal-soft text-signal">
            <AudioLines size={26} aria-hidden="true" />
          </span>
          <h2 className="font-display text-h3 leading-tight text-bone">Your library is empty</h2>
          <p className="text-fine text-bone-dim">Add songs from this phone. Tags and covers are read from the files, and everything stays on this device.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => filePicker.current?.click()}>
              Add songs
            </Button>
            <Button variant="ghost" size="sm" loading={sampling} onClick={trySamples}>
              <Sparkles size={14} aria-hidden="true" /> Try sample songs
            </Button>
          </div>
        </section>
      )}

      {!empty && section === 'home' && (
        <>
          <h2 className="-mb-2 px-5 font-display text-[1.9rem] leading-none text-bone">{greetingFor(new Date().getHours())}</h2>
          <ul className="grid grid-cols-2 gap-2 px-5" aria-label="Quick picks">
            {[likedItem, ...playlistItems, ...albumItems].slice(0, 6).map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => setPage(item.open)} className="flex h-14 w-full items-center gap-2.5 overflow-hidden rounded-lg bg-white/8 pr-2 text-left active:scale-[0.97]">
                  <Orbit tracks={item.tracks} liked={item.liked} className="size-14 rounded-none!" />
                  <b className="line-clamp-2 min-w-0 text-[0.8rem] leading-tight font-medium text-bone">{item.title}</b>
                </button>
              </li>
            ))}
          </ul>

          <Section title={played ? 'Recently played' : 'Your songs'}>
            <ul className="grid grid-cols-3 gap-3">
              {recent.map((t) => (
                <li key={t.id} data-track={t.title}>
                  <button type="button" onClick={() => playTrack(t.id, allIds)} aria-label={`Play ${t.title}`} className="block w-full text-left active:scale-95">
                    <Cover track={t} className="aspect-square w-full" rounded="rounded-lg" />
                    <b className="mt-1.5 block truncate text-[0.78rem] font-medium text-bone">{t.title}</b>
                    <small className="block truncate font-mono text-[0.64rem] text-bone-faint">{t.artist || 'Unknown artist'}</small>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Made for you" action={<span className="font-mono text-[0.66rem] text-bone-faint">Hank DJ</span>}>
            <ul className="grid grid-cols-2 gap-2.5">
              {MOODS.map((m) => (
                <li key={m}>
                  <button type="button" onClick={() => void askDj(m)} className="relative flex h-20 w-full items-start overflow-hidden rounded-xl p-3 text-left active:scale-[0.97]" style={{ background: tileBackground(m) }}>
                    <b className="font-display text-[1.15rem] leading-none text-white">{m}</b>
                    <Sparkles size={34} className="absolute -right-1 -bottom-1 rotate-12 text-white/25" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); void askDj(); }} className="flex gap-2">
              <input aria-label="Tell Hank DJ what to play" placeholder="or say it in your own words…" value={dj.text} onChange={(e) => setDj({ ...dj, text: e.target.value })} className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/6 px-4 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" loading={dj.busy} disabled={!dj.text.trim()}>
                Play
              </Button>
            </form>
            {(dj.note || dj.error) && <p className={clsx('font-mono text-fine', dj.error ? 'text-danger' : 'text-bone-dim')} role="status">{dj.error || dj.note}</p>}
          </Section>

          {albumItems.length > 0 && (
            <Section title="Your albums">
              <ul className="grid grid-cols-3 gap-3">
                {albumItems.map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => setPage(item.open)} aria-label={`Open ${item.title}`} className="block w-full text-left active:scale-95">
                      <Orbit tracks={item.tracks} className="w-full rounded-lg!" />
                      <b className="mt-1.5 block truncate text-[0.78rem] font-medium text-bone">{item.title}</b>
                      <small className="block truncate font-mono text-[0.64rem] text-bone-faint">{item.sub}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {!empty && section === 'search' && (
        <>
          <label className="relative mx-5 block">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-0/70" aria-hidden="true" />
            <input type="search" aria-label="Search the library" placeholder="Songs, artists, albums" value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 w-full rounded-xl bg-bone pr-10 pl-11 text-body font-medium text-ink-0 placeholder:text-ink-0/55 focus-visible:outline-none" />
            {query && (
              <button type="button" aria-label="Clear the search" onClick={() => setQuery('')} className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-0/70">
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </label>
          {query.trim() ? (
            <section aria-label="Results">
              {results.length ? (
                <ul>
                  {results.map((t) => (
                    <TrackRow key={t.id} track={t} ids={results.map((r) => r.id)} />
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 font-mono text-fine text-bone-faint">Nothing matches “{query.trim()}”.</p>
              )}
            </section>
          ) : (
            <Section title="Browse all">
              <ul className="grid grid-cols-2 gap-2.5">
                {[...genres, ...MOODS].map((name) => (
                  <li key={name}>
                    <button type="button" onClick={() => (genres.includes(name) ? setQuery(name) : void askDj(name))} className="relative flex h-24 w-full items-start overflow-hidden rounded-xl p-3 text-left active:scale-[0.97]" style={{ background: tileBackground(name) }}>
                      <b className="font-display text-[1.2rem] leading-none text-white capitalize">{name}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {!empty && section === 'library' && (
        <>
          <div className="flex flex-wrap gap-1.5 px-5" role="tablist" aria-label="Library shelves">
            {SHELVES.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={shelf === id} onClick={() => setShelf(id)} className={clsx('rounded-full px-3.5 py-1.5 font-mono text-[0.78rem] transition-colors active:scale-95', shelf === id ? 'bg-signal text-ink-0' : 'bg-white/8 text-bone-dim')}>
                {label}
              </button>
            ))}
          </div>
          {shelf === 'songs' && (
            <div className="-mb-3 flex items-center gap-3 px-5">
              <button type="button" aria-label="Shuffle play" onClick={() => void playList(allIds, { shuffle: true })} className="grid size-12 shrink-0 place-items-center rounded-full bg-signal text-ink-0 shadow-[0_10px_24px_-10px_var(--color-signal)] active:scale-95">
                <Play size={20} fill="currentColor" className="translate-x-px" aria-hidden="true" />
              </button>
              <span className="leading-tight">
                <b className="block text-fine font-medium text-bone">Shuffle play</b>
                <small className="font-mono text-[0.7rem] text-bone-faint">{tracks.length} songs</small>
              </span>
            </div>
          )}
          {newPlaylist !== null && (
            <form onSubmit={createList} className="mx-5 flex gap-2">
              <input autoFocus aria-label="New playlist name" placeholder="Name the playlist" value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setNewPlaylist(null)} className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/6 px-4 text-fine text-bone focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" disabled={!newPlaylist.trim()}>
                Create
              </Button>
            </form>
          )}
          <ul className="-mt-3 flex flex-col" aria-label={SHELVES.find((s) => s.id === shelf)?.label}>
            {shelf === 'playlists' && (
              <li className="px-3">
                <button type="button" onClick={() => setNewPlaylist('')} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-white/6">
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/8 text-bone-dim">
                    <Plus size={22} aria-hidden="true" />
                  </span>
                  <b className="text-fine font-medium text-bone">New playlist</b>
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
