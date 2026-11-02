import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderPlus,
  Heart,
  ListMusic,
  MoonStar,
  MoreHorizontal,
  Music2,
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
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Button, Menu } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { djPick } from '../api/owner';
import { activeLine, parseLrc } from '../music/lrc';
import Cover, { useCoverTint } from '../music/Cover';
import {
  addSamples,
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  formatTime,
  groupTracks,
  importFiles,
  library,
  loadLibrary,
  removeFromPlaylist,
  removeSamples,
  removeTracks,
  setLyrics,
  toggleFavorite,
} from '../music/library';
import { cycleRepeat, next, playList, player, playTrack, previous, queueLast, queueNext, seek, setSleepTimer, setVolume, toggleShuffle, togglePlay } from '../music/player';
import RadialVisualizer from '../music/RadialVisualizer';
import { storageEstimate } from '../storage';
import { useStore } from '../store';

const SHELVES = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'liked', label: 'Liked' },
];

const MOODS = ['Focus', 'Late night', 'Rainy day', 'Upbeat', 'Calm'];

const matches = (track, q) => !q || `${track.title} ${track.artist} ${track.album} ${track.genre}`.toLowerCase().includes(q.toLowerCase());

/** A thin range slider that fills as it goes (styles in index.css). */
function Slider({ label, value, max, step = 1, onChange, className }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <input type="range" aria-label={label} min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={clsx('player-range', className)} style={{ '--fill': `${pct}%` }} />;
}

/** A round picture for a collection: a gradient heart, up to four covers as quarters, or one cover. */
function Orbit({ tracks = [], liked, className }) {
  const withArt = tracks.filter((t) => t.hasCover);
  return (
    <span className={clsx('relative block aspect-square shrink-0 overflow-hidden rounded-full', className)}>
      {liked ? (
        <span className="grid size-full place-items-center bg-gradient-to-br from-signal via-[#ff8a5c] to-[#8a3bff] text-ink-0">
          <Heart size="38%" fill="currentColor" aria-hidden="true" />
        </span>
      ) : withArt.length >= 4 ? (
        <span className="grid size-full grid-cols-2">
          {withArt.slice(0, 4).map((t) => (
            <Cover key={t.id} track={t} className="size-full" rounded="rounded-none" />
          ))}
        </span>
      ) : (
        <Cover track={withArt[0] ?? tracks[0]} className="size-full" rounded="rounded-none" />
      )}
    </span>
  );
}

/** The record: cover as its label, grooves around it, turning slowly while a song plays, with a halo of sound. */
function Disc({ track, playing, tint, onEmpty }) {
  return (
    <div className="relative mx-auto aspect-square w-[min(360px,78vw)]">
      <RadialVisualizer className="absolute -inset-[22%] size-[144%]" tint={tint} />
      <div
        className={clsx('disc-spin absolute inset-0 rounded-full', playing && 'on')}
        style={{
          background:
            'conic-gradient(from 25deg, transparent 0 26%, rgb(255 255 255 / 0.1) 32%, transparent 38% 74%, rgb(255 255 255 / 0.07) 80%, transparent 86%), repeating-radial-gradient(circle at center, #0b0b0d 0 2px, #18181d 2px 3px)',
          boxShadow: `0 30px 80px -20px rgb(${tint} / 0.55), 0 0 0 1px rgb(255 255 255 / 0.06)`,
        }}
      >
        <button
          type="button"
          onClick={track ? undefined : onEmpty}
          aria-label={track ? undefined : 'Add songs'}
          className="absolute top-1/2 left-1/2 grid aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full bg-ink-3 text-bone-faint ring-4 ring-black/40"
        >
          {track ? <Cover track={track} className="size-full" rounded="rounded-none" /> : <Plus size={42} strokeWidth={1.4} aria-hidden="true" />}
          <i className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0 ring-2 ring-white/20" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Lyrics as a soft ribbon: the line being sung is bright, and the others fade and blur away from it. */
function Ribbon({ lines, active }) {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current?.querySelector('[data-active="true"]');
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [active]);
  return (
    <div ref={box} className="relative max-h-[300px] overflow-y-auto py-24 [mask-image:linear-gradient(transparent,#000_28%,#000_72%,transparent)]" aria-label="Lyrics" tabIndex={0}>
      {lines.map((line, i) => {
        const d = Math.abs(i - active);
        return (
          <p
            key={`${line.time}-${i}`}
            data-active={i === active}
            className="origin-left py-1.5 font-display text-h3 leading-tight text-bone transition-all duration-700"
            style={{ opacity: i === active ? 1 : Math.max(0.12, 0.5 - d * 0.14), filter: `blur(${i === active ? 0 : Math.min(3, d * 0.9)}px)`, transform: `scale(${i === active ? 1 : 0.9})` }}
          >
            {line.text || ' '}
          </p>
        );
      })}
    </div>
  );
}

function SheetRow({ track, index, ids, playlists, inPlaylist, onRemoveFromPlaylist }) {
  const current = useStore(player, (s) => s.trackId === track.id);
  const playing = useStore(player, (s) => s.trackId === track.id && s.playing);
  const items = [
    { id: 'next', label: 'Play next', onSelect: () => queueNext(track.id) },
    { id: 'last', label: 'Add to queue', onSelect: () => queueLast(track.id) },
    ...playlists.map((p) => ({ id: `pl-${p.id}`, label: `Add to ${p.name}`, onSelect: () => addToPlaylist(p.id, track.id) })),
    { id: 'new', label: 'Add to a new playlist', onSelect: () => createPlaylist(track.album || track.title, [track.id]) },
    ...(inPlaylist ? [{ id: 'out', label: 'Remove from this playlist', onSelect: onRemoveFromPlaylist }] : []),
    { id: 'rm', label: 'Delete from library', icon: Trash2, onSelect: () => removeTracks([track.id]) },
  ];
  return (
    <li className={clsx('group flex items-center gap-3 rounded-2xl px-2.5 py-1.5 transition-colors hover:bg-white/8', current && 'bg-white/10')} data-sheet-track={track.title}>
      <button type="button" onClick={() => (current ? togglePlay() : playTrack(track.id, ids))} aria-label={`${playing ? 'Pause' : 'Play'} ${track.title} from the list`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="w-5 shrink-0 text-center font-mono text-[0.72rem] text-bone-faint tabular-nums">{index + 1}</span>
        <Cover track={track} className="size-10" rounded="rounded-full" />
        <span className="min-w-0 leading-tight">
          <b className={clsx('block truncate text-fine font-medium', current ? 'text-signal' : 'text-bone')}>{track.title}</b>
          <small className="block truncate font-mono text-[0.72rem] text-bone-faint">{track.artist || 'Unknown artist'}</small>
        </span>
      </button>
      <span className="font-mono text-[0.72rem] text-bone-faint tabular-nums max-sm:hidden">{formatTime(track.duration)}</span>
      <button type="button" aria-label={track.favorite ? `Remove ${track.title} from favorites in the list` : `Add ${track.title} to favorites in the list`} aria-pressed={track.favorite} onClick={() => toggleFavorite(track.id)} className={clsx('grid size-8 place-items-center rounded-full hover:text-signal', track.favorite ? 'text-signal' : 'text-bone-faint')}>
        <Heart size={15} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <Menu align="end" trigger={<button type="button" aria-label={`More for ${track.title}`} className="grid size-8 place-items-center rounded-full text-bone-faint hover:text-bone"><MoreHorizontal size={16} aria-hidden="true" /></button>} items={items} />
    </li>
  );
}

export default function MusicView() {
  const { loaded, tracks, playlists, error } = useStore(library);
  const { trackId, playing, loading, time, duration, volume, shuffle, repeat, sleepAt, queue } = useStore(player);
  const current = useMemo(() => tracks.find((t) => t.id === trackId) ?? null, [tracks, trackId]);
  const tint = useCoverTint(current);
  const [shelf, setShelf] = useState('songs');
  const [sheet, setSheet] = useState(null); // { kind, key } the collection open in the drawer
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState('');
  const [usage, setUsage] = useState(null);
  const [mood, setMood] = useState('');
  const [dj, setDj] = useState({ busy: false, note: '', error: '' });
  const [sampling, setSampling] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState(null);
  const filePicker = useRef(null);
  const folderPicker = useRef(null);
  const lyricsInput = useRef(null);

  useEffect(() => {
    void loadLibrary();
  }, []);
  useEffect(() => {
    storageEstimate().then(setUsage);
  }, [tracks.length]);

  const add = async (files) => {
    if (!files.length) return;
    setNotice('');
    const result = await importFiles(files, setProgress);
    setProgress(null);
    const parts = [`${result.added} added`];
    if (result.skipped) parts.push(`${result.skipped} already there`);
    if (result.failed) parts.push(`${result.failed} could not be read`);
    if (result.lyrics) parts.push(`${result.lyrics} lyrics attached`);
    setNotice(parts.join(' · '));
  };

  const trySamples = async () => {
    setSampling(true);
    const added = await addSamples();
    setSampling(false);
    setNotice(added ? `${added} sample songs added. They are original and made in your browser.` : 'The sample songs are already here.');
  };

  const askDj = async (wish) => {
    const text = (wish ?? mood).trim();
    if (!text || dj.busy) return;
    setMood(text);
    setDj({ busy: true, note: '', error: '' });
    try {
      const pick = await djPick({ mood: text, tracks: tracks.map((t) => ({ id: t.id, title: t.title, artist: t.artist, genre: t.genre })) });
      if (!pick.ids.length) throw new Error('Nothing in your library fits that. Try other words.');
      await playList(pick.ids);
      setDj({ busy: false, note: pick.note, error: '' });
    } catch (e) {
      setDj({ busy: false, note: '', error: e.message });
    }
  };

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const albums = useMemo(() => groupTracks(tracks, 'album').filter((g) => g.key), [tracks]);
  const artists = useMemo(() => groupTracks(tracks, 'artist').filter((g) => g.key), [tracks]);
  const liked = useMemo(() => tracks.filter((t) => t.favorite), [tracks]);
  const of = (g) => g.trackIds.map((id) => byId.get(id)).filter(Boolean);
  const hasSamples = tracks.some((t) => t.sample);
  const lines = useMemo(() => parseLrc(current?.lyrics), [current?.lyrics]);
  const active = activeLine(lines, time);
  const upNext = queue.order
    .slice(queue.index + 1, queue.index + 5)
    .map((id) => byId.get(id))
    .filter(Boolean);

  // what the drawer shows
  const drawer = useMemo(() => {
    if (query.trim()) return { title: `Results for “${query.trim()}”`, tracks: tracks.filter((t) => matches(t, query)) };
    if (!sheet) return null;
    if (sheet.kind === 'liked') return { title: 'Liked', tracks: liked, liked: true };
    if (sheet.kind === 'album') return { title: sheet.key, sub: 'Album', tracks: tracks.filter((t) => t.album === sheet.key) };
    if (sheet.kind === 'artist') return { title: sheet.key, sub: 'Artist', tracks: tracks.filter((t) => t.artist === sheet.key) };
    const p = playlists.find((x) => x.id === sheet.key);
    return p ? { title: p.name, sub: 'Playlist', tracks: p.trackIds.map((id) => byId.get(id)).filter(Boolean), playlist: p } : null;
  }, [query, sheet, tracks, liked, playlists, byId]);

  const items = useMemo(() => {
    if (shelf === 'songs') return tracks.map((t) => ({ key: t.id, track: t }));
    if (shelf === 'albums') return albums.map((g) => ({ key: g.key, title: g.title, sub: g.subtitle || 'Album', tracks: of(g), open: { kind: 'album', key: g.key } }));
    if (shelf === 'artists') return artists.map((g) => ({ key: g.key, title: g.title, sub: `${g.trackIds.length} songs`, tracks: of(g), open: { kind: 'artist', key: g.key } }));
    if (shelf === 'playlists') return playlists.map((p) => ({ key: p.id, title: p.name, sub: `${p.trackIds.length} songs`, tracks: p.trackIds.map((id) => byId.get(id)).filter(Boolean), open: { kind: 'playlist', key: p.id } }));
    return [{ key: 'liked', title: 'Liked songs', sub: `${liked.length} songs`, liked: true, tracks: liked, open: { kind: 'liked' } }];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `of` only reads byId
  }, [shelf, tracks, albums, artists, playlists, liked, byId]);

  // when a collection opens, bring it into view
  const drawerRef = useRef(null);
  const drawerOpen = Boolean(drawer);
  useEffect(() => {
    if (drawerOpen) drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [drawerOpen, sheet]);

  const createList = async (event) => {
    event.preventDefault();
    if (!newPlaylist?.trim()) return;
    const p = await createPlaylist(newPlaylist);
    setNewPlaylist(null);
    setShelf('playlists');
    setSheet({ kind: 'playlist', key: p.id });
  };

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const empty = loaded && !tracks.length;

  return (
    <div
      className="relative isolate min-h-[calc(100vh-10rem)] overflow-hidden rounded-[2rem] border border-line bg-ink-1"
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget) || setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void add([...e.dataTransfer.files]);
      }}
    >
      <input ref={filePicker} type="file" multiple accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.lrc" hidden data-file-input onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />
      <input ref={folderPicker} type="file" multiple webkitdirectory="" hidden onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />

      {/* the room's light: soft colour from the cover, drifting slowly */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <i className="room-blob absolute -top-1/4 -left-1/6 size-[70%] animate-[drift_22s_ease-in-out_infinite] rounded-full blur-[110px] transition-colors duration-1000" style={{ background: `rgb(${tint} / 0.42)` }} />
        <i className="room-blob absolute -right-1/6 bottom-[-20%] size-[65%] animate-[drift_28s_ease-in-out_infinite_reverse] rounded-full bg-[#8a3bff]/25 blur-[120px]" />
        <i className="room-blob absolute top-1/3 left-1/3 size-[40%] animate-[drift_34s_ease-in-out_infinite] rounded-full bg-signal/15 blur-[100px]" />
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-[1.6rem] border-2 border-dashed border-signal bg-ink-0/80 font-mono text-bone backdrop-blur">
          Drop songs (and .lrc lyrics) into the room
        </div>
      )}

      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-7">
        <h1 className="flex items-center gap-2 font-display text-lead text-bone">
          <Music2 size={18} className="text-signal" aria-hidden="true" /> Hank Music
        </h1>
        <div className={clsx('relative ml-auto transition-all', searching || query ? 'w-full max-w-xs' : 'w-10')}>
          {searching || query ? (
            <>
              <Search size={15} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-bone-dim" aria-hidden="true" />
              <input
                autoFocus
                aria-label="Search the library"
                placeholder="Search songs, artists…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearching(false)}
                className="h-10 w-full rounded-full border border-white/10 bg-black/30 pr-9 pl-10 text-fine text-bone backdrop-blur placeholder:text-bone-dim focus-visible:border-signal focus-visible:outline-none"
              />
              <button type="button" aria-label="Clear the search" onClick={() => { setQuery(''); setSearching(false); }} className="absolute top-1/2 right-3 -translate-y-1/2 text-bone-dim hover:text-bone">
                <X size={14} aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" aria-label="Search the library" onClick={() => setSearching(true)} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/25 text-bone-dim backdrop-blur transition-colors hover:text-bone">
              <Search size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <Menu
          align="end"
          trigger={
            <button type="button" aria-label="Add music" className="grid size-10 place-items-center rounded-full bg-bone text-ink-0 transition-transform hover:scale-105">
              <Plus size={18} aria-hidden="true" />
            </button>
          }
          items={[
            { id: 'songs', label: 'Add songs', icon: Upload, onSelect: () => filePicker.current?.click() },
            { id: 'folder', label: 'Add a folder', icon: FolderPlus, onSelect: () => folderPicker.current?.click() },
            { id: 'playlist', label: 'New playlist', icon: ListMusic, onSelect: () => { setShelf('playlists'); setNewPlaylist(''); } },
          ]}
        />
      </div>
      {(progress || notice || error) && (
        <p className="px-5 pt-3 font-mono text-fine text-bone-dim sm:px-7" role="status">
          {progress ? `Reading ${progress.done + 1} of ${progress.total}: ${progress.name}` : error || notice}
        </p>
      )}

      {/* the stage */}
      <div className="grid grid-cols-1 items-center gap-8 px-5 py-10 sm:px-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-12">
        <div className="flex flex-col items-center gap-7">
          <Disc track={current} playing={playing} tint={tint} onEmpty={() => filePicker.current?.click()} />

          {empty ? (
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <h2 className="font-display text-h3 leading-tight text-bone">The room is quiet</h2>
              <p className="text-bone-dim">Drop songs here, or add some. Tags and covers are read from the files, and everything stays in this browser.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => filePicker.current?.click()}>
                  Add songs
                </Button>
                <Button variant="ghost" size="sm" loading={sampling} onClick={trySamples}>
                  <Sparkles size={14} aria-hidden="true" /> Try with sample songs
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-md flex-col items-center gap-4" data-now-playing>
              <div className="text-center leading-tight">
                <h2 className="font-display text-h2 text-bone" data-now-title>
                  {current ? current.title : 'Pick something'}
                </h2>
                <p className="mt-1 text-bone-dim">{current ? [current.artist, current.album].filter(Boolean).join(' · ') || 'Unknown artist' : 'Choose a song below and the record starts to turn.'}</p>
              </div>

              <div className="flex w-full items-center gap-3">
                <span className="w-9 text-right font-mono text-[0.72rem] text-bone-dim tabular-nums">{formatTime(time)}</span>
                <Slider label="Seek" value={Math.floor(time)} max={Math.max(1, Math.floor(duration))} onChange={seek} className="flex-1" />
                <span className="w-9 font-mono text-[0.72rem] text-bone-dim tabular-nums">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
                <button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} className={clsx('grid size-10 place-items-center rounded-full transition-colors hover:text-bone', shuffle ? 'text-signal' : 'text-bone-dim')}>
                  <Shuffle size={16} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Previous track" onClick={previous} className="grid size-11 place-items-center rounded-full text-bone transition-colors hover:bg-white/10">
                  <SkipBack size={19} fill="currentColor" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={playing ? 'Pause' : 'Play'}
                  onClick={togglePlay}
                  className={clsx('grid size-14 place-items-center rounded-full bg-gradient-to-br from-signal to-[#ff8a5c] text-ink-0 shadow-[0_10px_30px_-8px_rgb(255_91_46/0.8)] transition-transform hover:scale-105 active:scale-95', loading && 'animate-pulse')}
                >
                  {playing ? <Pause size={22} fill="currentColor" aria-hidden="true" /> : <Play size={22} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
                </button>
                <button type="button" aria-label="Next track" onClick={next} className="grid size-11 place-items-center rounded-full text-bone transition-colors hover:bg-white/10">
                  <SkipForward size={19} fill="currentColor" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={clsx('grid size-10 place-items-center rounded-full transition-colors hover:text-bone', repeat !== 'off' ? 'text-signal' : 'text-bone-dim')}>
                  <RepeatIcon size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="flex w-full items-center justify-center gap-3">
                {current && (
                  <button type="button" aria-label={current.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={current.favorite} onClick={() => toggleFavorite(current.id)} className={clsx('grid size-9 place-items-center rounded-full transition-colors hover:text-signal', current.favorite ? 'text-signal' : 'text-bone-dim')}>
                    <Heart size={18} fill={current.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                )}
                <span className="flex items-center gap-2 text-bone-dim">
                  <button type="button" aria-label={volume === 0 ? 'Unmute' : 'Mute'} onClick={() => setVolume(volume === 0 ? 0.8 : 0)} className="grid size-8 place-items-center hover:text-bone">
                    {volume === 0 ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
                  </button>
                  <Slider label="Volume" value={volume} max={1} step={0.02} onChange={setVolume} className="w-24" />
                </span>
                {current && (
                  <Menu
                    align="end"
                    trigger={
                      <button type="button" aria-label="Sleep timer" className={clsx('grid size-9 place-items-center rounded-full transition-colors hover:text-bone', sleepAt ? 'text-signal' : 'text-bone-dim')}>
                        <MoonStar size={16} aria-hidden="true" />
                      </button>
                    }
                    items={[...[15, 30, 60].map((m) => ({ id: `s${m}`, label: `Stop after ${m} min`, onSelect: () => setSleepTimer(m) })), { id: 'off', label: 'No sleep timer', onSelect: () => setSleepTimer(0) }]}
                  />
                )}
              </div>
              {error && <p className="font-mono text-fine text-danger">{error}</p>}
            </div>
          )}
        </div>

        {/* right: lyrics ribbon, or Hank DJ and what is next */}
        <div className="flex min-w-0 flex-col gap-6">
          {lines.length > 0 ? (
            <Ribbon lines={lines} active={active} />
          ) : current ? (
            <div className="flex flex-col items-start gap-2">
              <p className="font-display text-h3 leading-tight text-bone-dim">No lyrics for this one.</p>
              <Button variant="ghost" size="sm" onClick={() => lyricsInput.current?.click()}>
                Add lyrics (.lrc)
              </Button>
            </div>
          ) : null}
          <input ref={lyricsInput} type="file" accept=".lrc,text/plain" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (file && current) await setLyrics(current.id, await file.text()); e.target.value = ''; }} />
          {lines.length > 0 && current && (
            <button type="button" onClick={() => lyricsInput.current?.click()} className="-mt-3 self-start font-mono text-[0.72rem] text-bone-faint underline hover:text-bone">
              Replace lyrics
            </button>
          )}

          {!empty && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askDj();
              }}
              className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-black/20 p-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-signal text-ink-0">
                  <Sparkles size={15} aria-hidden="true" />
                </span>
                <div className="leading-tight">
                  <b className="block font-display text-lead text-bone">Hank DJ</b>
                  <small className="font-mono text-[0.68rem] text-bone-dim">What does the room feel like?</small>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button key={m} type="button" onClick={() => void askDj(m)} className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5 font-mono text-[0.78rem] text-bone transition-all hover:-translate-y-0.5 hover:border-signal/60 hover:bg-signal/15">
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input aria-label="Tell Hank DJ what to play" placeholder="or say it in your own words…" value={mood} onChange={(e) => setMood(e.target.value)} className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/25 px-4 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
                <Button type="submit" size="sm" loading={dj.busy} disabled={!mood.trim()}>
                  Play a mix
                </Button>
              </div>
              {(dj.note || dj.error) && (
                <p className={clsx('font-mono text-fine', dj.error ? 'text-danger' : 'text-bone-dim')} role="status">
                  {dj.error || dj.note}
                </p>
              )}
            </form>
          )}

          {upNext.length > 0 && (
            <section aria-label="Next in queue">
              <h3 className="mb-2 font-mono text-[0.68rem] tracking-[0.12em] text-bone-dim uppercase">Next</h3>
              <ul className="flex flex-wrap gap-2">
                {upNext.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => playTrack(t.id, queue.order)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 py-1 pr-3.5 pl-1 text-fine text-bone transition-colors hover:bg-white/12">
                      <Cover track={t} className="size-7" rounded="rounded-full" /> <span className="max-w-[9rem] truncate">{t.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* the orbit rail */}
      {!empty && (
        <section className="relative pb-6" aria-label="Library">
          <div className="flex flex-wrap items-center gap-2 px-5 pb-4 sm:px-7">
            <div className="flex gap-1 rounded-full border border-white/10 bg-black/25 p-1 backdrop-blur" role="tablist" aria-label="Library shelves">
              {SHELVES.map(({ id, label }) => (
                <button key={id} type="button" role="tab" aria-selected={shelf === id} onClick={() => { setShelf(id); setSheet(null); }} className={clsx('rounded-full px-3.5 py-1 font-mono text-[0.78rem] transition-colors', shelf === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}>
                  {label}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[0.68rem] text-bone-faint">
              {tracks.length} songs · {playlists.length} playlists{usage ? ` · ${(usage.used / 1024 / 1024).toFixed(1)} MB` : ''}
            </span>
          </div>

          {shelf === 'playlists' && newPlaylist !== null && (
            <form onSubmit={createList} className="mx-5 mb-4 flex max-w-sm gap-2 sm:mx-7">
              <input autoFocus aria-label="New playlist name" placeholder="Name the playlist" value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setNewPlaylist(null)} className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/25 px-4 text-fine text-bone focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" disabled={!newPlaylist.trim()}>
                Create
              </Button>
            </form>
          )}

          <ul className="flex snap-x gap-5 overflow-x-auto px-5 pb-3 sm:px-7" aria-label={SHELVES.find((s) => s.id === shelf)?.label}>
            {shelf === 'playlists' && (
              <li className="w-28 shrink-0 snap-start">
                <button type="button" onClick={() => setNewPlaylist('')} className="grid aspect-square w-full place-items-center rounded-full border-2 border-dashed border-white/20 text-bone-dim transition-colors hover:border-signal hover:text-signal" aria-label="New playlist">
                  <Plus size={26} aria-hidden="true" />
                </button>
                <span className="mt-2 block text-center text-fine text-bone-dim">New</span>
              </li>
            )}
            {items.map((item) =>
              item.track ? (
                <li key={item.key} className="group relative w-28 shrink-0 snap-start" data-track={item.track.title}>
                  <button type="button" onClick={() => (item.track.id === trackId ? togglePlay() : playTrack(item.track.id, tracks.map((t) => t.id)))} aria-label={`${item.track.id === trackId && playing ? 'Pause' : 'Play'} ${item.track.title}`} className="block w-full text-center">
                    <span className={clsx('relative block aspect-square overflow-hidden rounded-full ring-2 ring-offset-4 ring-offset-transparent transition-all duration-300 group-hover:scale-105', item.track.id === trackId ? 'ring-signal' : 'ring-transparent')}>
                      <Cover track={item.track} className="size-full" rounded="rounded-none" />
                      <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                        {item.track.id === trackId && playing ? <Pause size={22} fill="currentColor" aria-hidden="true" /> : <Play size={22} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
                      </span>
                    </span>
                    <b className={clsx('mt-2 block truncate text-fine font-medium', item.track.id === trackId ? 'text-signal' : 'text-bone')}>{item.track.title}</b>
                    <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{item.track.artist || 'Unknown artist'}</small>
                  </button>
                  <button type="button" aria-label={item.track.favorite ? `Remove ${item.track.title} from favorites` : `Add ${item.track.title} to favorites`} aria-pressed={item.track.favorite} onClick={() => toggleFavorite(item.track.id)} className={clsx('absolute top-0 right-0 grid size-7 place-items-center rounded-full bg-black/55 backdrop-blur transition-opacity hover:text-signal group-hover:opacity-100', item.track.favorite ? 'text-signal opacity-100' : 'text-bone opacity-0 focus-visible:opacity-100')}>
                    <Heart size={13} fill={item.track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                </li>
              ) : (
                <li key={item.key} className="group w-28 shrink-0 snap-start">
                  <button type="button" onClick={() => setSheet(item.open)} aria-label={`Open ${item.title}`} className="block w-full text-center">
                    <Orbit tracks={item.tracks} liked={item.liked} className="w-full ring-2 ring-transparent ring-offset-4 ring-offset-transparent transition-all duration-300 group-hover:scale-105" />
                    <b className="mt-2 block truncate text-fine font-medium text-bone">{item.title}</b>
                    <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{item.sub}</small>
                  </button>
                </li>
              )
            )}
            {!items.length && <li className="py-6 font-mono text-fine text-bone-faint">{shelf === 'liked' ? 'Nothing liked yet. Tap a heart.' : 'Nothing here yet.'}</li>}
          </ul>

          <div className="flex flex-wrap gap-2 px-5 pt-1 sm:px-7">
            {hasSamples ? (
              <Button variant="ghost" size="sm" onClick={() => removeSamples()}>
                <Trash2 size={14} aria-hidden="true" /> Remove the sample songs
              </Button>
            ) : (
              <Button variant="ghost" size="sm" loading={sampling} onClick={trySamples}>
                <Sparkles size={14} aria-hidden="true" /> Add sample songs
              </Button>
            )}
            <span className="self-center font-mono text-[0.68rem] text-bone-faint">Kept on this device. Only titles go to Hank DJ, never audio.</span>
          </div>
        </section>
      )}

      {/* the drawer: a collection's songs, rising from the bottom */}
      {drawer && (
        <div ref={drawerRef} className="mx-3 mb-3 flex max-h-[72vh] animate-[enter_0.5s_var(--ease-out-expo)_both] flex-col overflow-hidden rounded-[1.75rem] border border-white/12 bg-ink-0/85 shadow-[0_-30px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-2xl" role="dialog" aria-label={drawer.title}>
          <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
            <Orbit tracks={drawer.tracks} liked={drawer.liked} className="size-12" />
            <div className="min-w-0 flex-1 leading-tight">
              <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{drawer.sub ?? 'Library'}</span>
              <h2 className="truncate font-display text-h3 text-bone">{drawer.title}</h2>
            </div>
            <button type="button" aria-label="Play all" disabled={!drawer.tracks.length} onClick={() => playList(drawer.tracks.map((t) => t.id))} className="grid size-11 place-items-center rounded-full bg-signal text-ink-0 transition-transform hover:scale-105 disabled:opacity-40">
              <Play size={18} fill="currentColor" className="translate-x-px" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Shuffle play" disabled={!drawer.tracks.length} onClick={() => playList(drawer.tracks.map((t) => t.id), { shuffle: true })} className="grid size-10 place-items-center rounded-full text-bone-dim hover:text-bone disabled:opacity-40">
              <Shuffle size={17} aria-hidden="true" />
            </button>
            {drawer.playlist && (
              <Button variant="danger" size="sm" onClick={() => { void deletePlaylist(drawer.playlist.id); setSheet(null); }}>
                Delete
              </Button>
            )}
            <button type="button" aria-label="Close the list" onClick={() => { setSheet(null); setQuery(''); setSearching(false); }} className="grid size-10 place-items-center rounded-full text-bone-dim hover:bg-white/10 hover:text-bone">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            {drawer.tracks.length ? (
              <ul aria-label="Songs">
                {drawer.tracks.map((track, i) => (
                  <SheetRow key={track.id} track={track} index={i} ids={drawer.tracks.map((t) => t.id)} playlists={playlists} inPlaylist={Boolean(drawer.playlist)} onRemoveFromPlaylist={() => removeFromPlaylist(drawer.playlist.id, track.id)} />
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center font-mono text-fine text-bone-faint">{query ? 'Nothing matches that search.' : 'Nothing here yet.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
