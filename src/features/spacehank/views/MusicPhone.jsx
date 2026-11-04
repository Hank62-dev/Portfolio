import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSheetDrag } from '../../../design-system/useSheetDrag';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import {
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
import { greetingFor, owner } from '../config';
import Cover, { useCoverTint } from '../music/Cover';
import {
  createPlaylist,
  deletePlaylist,
  formatTime,
  groupTracks,
  importFiles,
  library,
  loadLibrary,
  removeSamples,
  toggleFavorite,
} from '../music/library';
import Lyrics from '../music/Lyrics';
import { MOODS, Orbit, SheetRow, Slider, matches } from '../music/parts';
import { cycleRepeat, next, playList, player, playTrack, previous, seek, setSleepTimer, toggleShuffle, togglePlay } from '../music/player';
import { closePlayer, musicUi } from '../music/ui';
import { useStore } from '../store';

// Hank Music on a phone. It keeps the shape people know from music apps (Home, Search, Library, a page for each
// collection, a full-screen player) but has a look of its own: the record. Covers are discs that turn while a song
// plays, a collection is a sleeve with its record sliding out, the player is a turntable with a tonearm and a ring
// of progress, and the colours come from the song that is playing, over a warm gold.

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

const GOLD = '232 178 74';
const GROOVES =
  'conic-gradient(from 25deg, transparent 0 26%, rgb(255 255 255 / 0.1) 32%, transparent 38% 74%, rgb(255 255 255 / 0.07) 80%, transparent 86%), repeating-radial-gradient(circle at center, #0b0b0d 0 2px, #18181d 2px 3px)';

const hashHue = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);
/** A card's colour: two soft glows on a dark ground, in a hue taken from its name, so each mix has a mood of its own. */
const auroraOf = (text) => {
  const hue = hashHue(text);
  return `radial-gradient(120% 90% at 0% 0%, hsl(${hue} 75% 52% / 0.85), transparent 60%), radial-gradient(100% 100% at 100% 100%, hsl(${(hue + 70) % 360} 70% 45% / 0.8), transparent 62%), hsl(${hue} 40% 12%)`;
};

const Layer = ({ children }) => createPortal(children, document.querySelector('.app-shell') ?? document.body);

/** A record: the cover as its label inside the grooves. It turns while `spinning`; `progress` (0 to 1) draws a ring of gold around it. */
function Vinyl({ track, spinning, progress = null, tonearm = false, tint = GOLD, className }) {
  return (
    <div className={clsx('relative aspect-square', className)}>
      {progress !== null && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="48.6" fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth="0.9" />
          <circle cx="50" cy="50" r="48.6" fill="none" stroke="var(--color-signal)" strokeWidth="1.5" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0.01, progress * 100)} 100`} style={{ transition: 'stroke-dasharray 0.4s linear', filter: 'drop-shadow(0 0 2px var(--color-signal))' }} />
        </svg>
      )}
      <div className={clsx('disc-spin absolute inset-[4.5%] rounded-full', spinning && 'on')} style={{ background: GROOVES, boxShadow: `0 30px 70px -22px rgb(${tint} / 0.65), 0 0 0 1px rgb(255 255 255 / 0.07)` }}>
        <span className="absolute top-1/2 left-1/2 aspect-square w-[60%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-ink-3 ring-[5px] ring-shade/50">
          <Cover track={track} className="size-full" rounded="rounded-none" />
        </span>
        <i className="absolute top-1/2 left-1/2 size-[4%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0 ring-2 ring-wash/25" aria-hidden="true" />
      </div>
      {tonearm && (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute -top-[9%] -right-[14%] w-[52%] origin-[78%_16%] transition-transform duration-[900ms] ease-out-expo" style={{ transform: `rotate(${spinning ? 21 : -6}deg)` }} aria-hidden="true">
          <circle cx="78" cy="16" r="10" fill="#1d1d22" stroke="#4a4a52" strokeWidth="1.5" />
          <circle cx="78" cy="16" r="3.5" fill="var(--color-signal)" />
          <path d="M78 16 L34 70 L27 79" fill="none" stroke="#d8d0bf" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="17" y="76" width="15" height="8" rx="2.4" transform="rotate(-38 24 80)" fill="#ece6da" />
        </svg>
      )}
    </div>
  );
}

/** A section's heading: a small gold label over a title with one word in italics. */
const Heading = ({ eyebrow, children, action }) => (
  <div className="flex items-end justify-between gap-3 px-5">
    <div>
      <span className="block font-mono text-[0.6rem] tracking-[0.24em] text-signal uppercase">{eyebrow}</span>
      <h2 className="mt-1.5 font-display text-[1.55rem] leading-none text-bone">{children}</h2>
    </div>
    {action}
  </div>
);

/** One song as a row: a round cover that turns when it is the one playing, then the title, artist and length. */
function TrackRow({ track, ids }) {
  const current = useStore(player, (s) => s.trackId === track.id);
  const playing = useStore(player, (s) => s.trackId === track.id && s.playing);
  return (
    <li className="flex items-center px-3" data-track={track.title}>
      <button type="button" onClick={() => (current ? togglePlay() : playTrack(track.id, ids))} aria-label={`${current && playing ? 'Pause' : 'Play'} ${track.title}`} className="flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl px-2 py-1.5 text-left active:bg-wash/6">
        <span className="relative shrink-0">
          <Cover track={track} className={clsx('size-[3.2rem] ring-1 ring-wash/12 [animation:disc_14s_linear_infinite]', !(current && playing) && '[animation-play-state:paused]')} rounded="rounded-full" />
          <i className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0 ring-1 ring-wash/25" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className={clsx('block truncate font-display text-[1.08rem] font-normal', current ? 'text-signal' : 'text-bone')}>{track.title}</b>
          <small className="mt-1 flex items-center gap-2 font-mono text-[0.68rem] text-bone-faint">
            {current && playing && (
              <span className="eq eq-on" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
            <span className="truncate">{track.artist || 'Unknown artist'}</span>
          </small>
        </span>
        <span className="shrink-0 font-mono text-[0.68rem] text-bone-faint tabular-nums">{formatTime(track.duration)}</span>
      </button>
      <button type="button" aria-label={track.favorite ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`} aria-pressed={track.favorite} onClick={() => toggleFavorite(track.id)} className={clsx('grid size-11 shrink-0 place-items-center rounded-full active:scale-90', track.favorite ? 'text-signal' : 'text-bone-faint')}>
        <Heart size={18} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </li>
  );
}

/** An album, artist or playlist as a row: its sleeve, the name, and what it holds. */
function CollectionRow({ item, onOpen }) {
  return (
    <li className="px-3">
      <button type="button" onClick={() => onOpen(item.open)} aria-label={`Open ${item.title}`} className="flex w-full items-center gap-3.5 rounded-2xl px-2 py-1.5 text-left active:bg-wash/6">
        <Orbit tracks={item.tracks} liked={item.liked} className="size-[3.2rem] shrink-0 rounded-xl! ring-1 ring-wash/12" />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate font-display text-[1.08rem] font-normal text-bone">{item.title}</b>
          <small className="mt-1 block font-mono text-[0.68rem] text-bone-faint">{item.sub}</small>
        </span>
        <ChevronRight size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />
      </button>
    </li>
  );
}

/** The page of an album, artist or playlist: the sleeve with its record sliding out, play and shuffle, then the songs. */
function CollectionPage({ data, playlists, onClose, onDeleted }) {
  const leave = useHistoryLayer(true, onClose);
  const drag = useSheetDrag(leave); // pull the page down to put it away
  const tint = useCoverTint(data.tracks[0]);
  const accent = data.tracks[0]?.hasCover ? tint : GOLD;
  const ids = data.tracks.map((t) => t.id);
  const nowId = useStore(player, (s) => s.trackId);
  const playing = useStore(player, (s) => s.playing);
  const repeat = useStore(player, (s) => s.repeat);
  const spinning = playing && ids.includes(nowId);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  return (
    <Layer>
      <div className="fixed inset-0 z-[25] animate-sheet-up overflow-y-auto overscroll-contain bg-ink-0 pb-48" style={{ ...drag.style, backgroundImage: `radial-gradient(90% 40% at 50% 0%, rgb(${accent} / 0.5), transparent 75%)` }} {...drag.bind} data-collection-page>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
          <button type="button" aria-label="Back" onClick={leave} className="grid size-10 place-items-center rounded-full border border-wash/12 bg-shade/35 text-bone backdrop-blur active:scale-90">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          {data.playlist && (
            <Menu
              align="end"
              trigger={
                <button type="button" aria-label="More" className="grid size-10 place-items-center rounded-full border border-wash/12 bg-shade/35 text-bone backdrop-blur active:scale-90">
                  <MoreHorizontal size={20} aria-hidden="true" />
                </button>
              }
              items={[{ id: 'del', label: 'Delete this playlist', icon: Trash2, onSelect: () => { void deletePlaylist(data.playlist.id); onDeleted(); } }]}
            />
          )}
        </div>

        {/* the sleeve, and the record half out of it */}
        <div className="relative mx-auto mt-3 h-[13rem] w-[min(19.5rem,86vw)]">
          <div className={clsx('disc-spin absolute top-1/2 right-0 aspect-square h-[88%] -translate-y-1/2 rounded-full', spinning && 'on')} style={{ background: GROOVES, boxShadow: `0 20px 50px -18px rgb(${accent} / 0.6), 0 0 0 1px rgb(255 255 255 / 0.07)` }}>
            <span className="absolute top-1/2 left-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-signal to-[#7a4b12] ring-4 ring-shade/40" />
            <i className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0" aria-hidden="true" />
          </div>
          <Orbit tracks={data.tracks} liked={data.liked} className="absolute top-0 left-0 z-10 h-full w-auto rounded-xl! shadow-[18px_0_44px_-14px_rgb(var(--shadow-rgb)/0.85)]" />
        </div>

        <div className="px-5 pt-6">
          <span className="font-mono text-[0.62rem] tracking-[0.24em] text-signal uppercase">{data.sub ?? 'Library'}</span>
          <h1 className="mt-1.5 font-display text-[2.2rem] leading-[1.02] text-bone">{data.title}</h1>
          <p className="mt-1.5 font-mono text-[0.72rem] text-bone-faint">{data.tracks.length} songs</p>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" aria-label="Shuffle play" disabled={!ids.length} onClick={() => void playList(ids, { shuffle: true })} className="grid size-12 place-items-center rounded-full border border-wash/15 text-bone-dim active:scale-90 disabled:opacity-40">
              <Shuffle size={18} aria-hidden="true" />
            </button>
            {/* off, then the whole list again and again, then one song again and again */}
            <button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={clsx('grid size-12 place-items-center rounded-full border active:scale-90', repeat === 'off' ? 'border-wash/15 text-bone-dim' : 'border-signal/50 bg-signal-soft text-signal')} data-repeat-list>
              <RepeatIcon size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Play all" disabled={!ids.length} onClick={() => void playList(ids)} className="ml-auto grid size-[3.7rem] place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_14px_30px_-10px_var(--color-signal)] ring-4 ring-signal/20 active:scale-95 disabled:opacity-40">
              <Play size={25} fill="currentColor" className="translate-x-px" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ul className="mt-4 px-2" aria-label="Songs">
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

/** The full-screen player: a turntable (the record turns, the tonearm lowers, a ring of gold shows the progress). */
function NowPlaying({ tracks, byId }) {
  const { trackId, playing, loading, time, duration, shuffle, repeat, sleepAt, queue, error } = useStore(player);
  const current = tracks.find((t) => t.id === trackId) ?? null;
  const tint = useCoverTint(current);
  const accent = current?.hasCover ? tint : GOLD;
  const leave = useHistoryLayer(true, closePlayer);
  const drag = useSheetDrag(leave); // pull the player down to put it away
  const upNext = queue.order.slice(queue.index + 1, queue.index + 6).map((id) => byId.get(id)).filter(Boolean);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  return (
    <Layer>
      <div className="fixed inset-0 z-[60] animate-sheet-up overflow-x-hidden overflow-y-auto overscroll-contain px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-10" style={{ ...drag.style, background: `radial-gradient(120% 55% at 50% 0%, rgb(${accent} / 0.55), transparent 75%), var(--color-ink-0)` }} {...drag.bind} data-now-playing-page>
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Close the player" onClick={leave} className="grid size-10 place-items-center rounded-full border border-wash/12 bg-wash/8 text-bone active:scale-90">
            <ChevronDown size={22} aria-hidden="true" />
          </button>
          <span className="font-mono text-[0.62rem] tracking-[0.24em] text-bone-dim uppercase">Now playing</span>
          <Menu
            align="end"
            trigger={
              <button type="button" aria-label="Sleep timer" className={clsx('grid size-10 place-items-center rounded-full border border-wash/12 bg-wash/8 active:scale-90', sleepAt ? 'text-signal' : 'text-bone')}>
                <MoonStar size={18} aria-hidden="true" />
              </button>
            }
            items={[...[15, 30, 60].map((m) => ({ id: `s${m}`, label: `Stop after ${m} min`, onSelect: () => setSleepTimer(m) })), { id: 'off', label: 'No sleep timer', onSelect: () => setSleepTimer(0) }]}
          />
        </div>

        <Vinyl track={current} spinning={playing} progress={duration > 0 ? time / duration : 0} tonearm tint={accent} className="mx-auto mt-8 w-[min(19.5rem,80vw)]" />

        <div className="mx-auto mt-8 flex w-full max-w-[22rem] items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate font-display text-[1.85rem] text-bone" data-now-title>
              {current?.title ?? 'Nothing playing'}
            </h2>
            <p className="mt-1.5 truncate font-mono text-[0.74rem] tracking-wide text-bone-dim">{current ? [current.artist, current.album].filter(Boolean).join(' · ') || 'Unknown artist' : 'Pick a song from the library'}</p>
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
            <span>-{formatTime(Math.max(0, duration - time))}</span>
          </div>
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-[22rem] items-center justify-between">
          <button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', shuffle ? 'text-signal' : 'text-bone-dim')}>
            <Shuffle size={20} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Previous track" onClick={previous} className="grid size-12 place-items-center rounded-full text-bone active:scale-90">
            <SkipBack size={27} fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay} className={clsx('grid size-[4.6rem] place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_18px_38px_-12px_var(--color-signal)] ring-[6px] ring-signal/20 active:scale-95', loading && 'animate-pulse')}>
            {playing ? <Pause size={30} fill="currentColor" aria-hidden="true" /> : <Play size={30} fill="currentColor" className="translate-x-0.5" aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Next track" onClick={next} className="grid size-12 place-items-center rounded-full text-bone active:scale-90">
            <SkipForward size={27} fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', repeat !== 'off' ? 'text-signal' : 'text-bone-dim')}>
            <RepeatIcon size={20} aria-hidden="true" />
          </button>
        </div>
        {error && <p className="mt-3 text-center font-mono text-fine text-danger">{error}</p>}

        {current && (
          <section className="mx-auto mt-8 w-full max-w-[22rem] rounded-[1.75rem] border border-wash/10 bg-shade/25 p-5 backdrop-blur" aria-label="Lyrics">
            <h3 className="font-mono text-[0.62rem] tracking-[0.24em] text-signal uppercase">Lyrics</h3>
            <div className="mt-3">
              <Lyrics track={current} time={time} duration={duration} compact />
            </div>
          </section>
        )}

        {upNext.length > 0 && (
          <section className="mx-auto mt-7 w-full max-w-[22rem]" aria-label="Next in queue">
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.24em] text-signal uppercase">
              <ListMusic size={13} aria-hidden="true" /> Up next
            </h3>
            <ul>
              {upNext.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => playTrack(t.id, queue.order)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left active:bg-wash/8">
                    <Cover track={t} className="size-11 ring-1 ring-wash/12" rounded="rounded-full" />
                    <span className="min-w-0 leading-tight">
                      <b className="block truncate font-display text-[1.02rem] font-normal text-bone">{t.title}</b>
                      <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{t.artist || 'Unknown artist'}</small>
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
  const nowId = useStore(player, (s) => s.trackId);
  const nowPlaying = useStore(player, (s) => s.playing);
  const [section, setSection] = useState('home');
  const [shelf, setShelf] = useState('songs');
  const [query, setQuery] = useState('');
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
  const sectionIndex = SECTIONS.findIndex((s) => s.id === section);

  const add = async (files) => {
    if (!files.length) return;
    setNotice('Reading your files…');
    const result = await importFiles(files, () => {});
    setNotice([`${result.added} added`, result.skipped && `${result.skipped} already there`, result.failed && `${result.failed} could not be read`].filter(Boolean).join(' · '));
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
        <div className="relative grid flex-1 grid-cols-3 rounded-full border border-wash/10 bg-wash/[0.05] p-1 backdrop-blur" role="tablist" aria-label="Music">
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
            <button type="button" aria-label="Add music" className="grid size-12 shrink-0 place-items-center rounded-full border border-signal/50 bg-signal-soft text-signal active:scale-90">
              <Plus size={20} aria-hidden="true" />
            </button>
          }
          items={[
            { id: 'songs', label: 'Add songs', icon: Upload, onSelect: () => filePicker.current?.click() },
            { id: 'folder', label: 'Add a folder', icon: FolderPlus, onSelect: () => folderPicker.current?.click() },
            { id: 'playlist', label: 'New playlist', icon: ListMusic, onSelect: () => { setSection('library'); setShelf('playlists'); setNewPlaylist(''); } },
            ...(hasSamples ? [{ id: 'rm', label: 'Remove the sample songs', icon: Trash2, onSelect: () => removeSamples() }] : []),
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
          <h2 className="font-display text-h3 leading-tight text-bone">The turntable is <em className="serif-accent">quiet</em></h2>
          <p className="text-fine text-bone-dim">Add songs from this phone, or drop files into <code className="font-mono text-[0.78rem]">src/assets/music</code> in the project. Tags and covers are read from the files, and everything stays on this device.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => filePicker.current?.click()}>
              Add songs
            </Button>
          </div>
        </section>
      )}

      {!empty && section === 'home' && (
        <>
          <div className="px-5">
            <span className="block font-mono text-[0.6rem] tracking-[0.24em] text-signal uppercase">{greetingFor(new Date().getHours())}</span>
            <h2 className="mt-2 font-display text-[2.1rem] leading-[1.02] text-bone">
              What shall we <em className="serif-accent">spin</em>, {owner.name}?
            </h2>
          </div>

          <ul className="grid grid-cols-2 gap-2 px-5" aria-label="Quick picks">
            {[likedItem, ...playlistItems, ...albumItems].slice(0, 6).map((item) => (
              <li key={item.key}>
                <button type="button" onClick={() => setPage(item.open)} className="flex h-14 w-full items-center gap-2.5 rounded-full border border-wash/10 bg-wash/[0.06] p-1 pr-3.5 text-left backdrop-blur active:scale-[0.97]">
                  <Orbit tracks={item.tracks} liked={item.liked} className="size-12 ring-1 ring-wash/15" />
                  <b className="line-clamp-2 min-w-0 font-display text-[0.92rem] leading-[1.1] font-normal text-bone">{item.title}</b>
                </button>
              </li>
            ))}
          </ul>

          <section className="flex flex-col gap-4" aria-label={played ? 'Recently played' : 'Your songs'}>
            <Heading eyebrow={played ? 'On rotation' : 'Your shelf'}>
              {played ? (
                <>
                  Recently <em className="serif-accent">played</em>
                </>
              ) : (
                <>
                  Your <em className="serif-accent">songs</em>
                </>
              )}
            </Heading>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 px-5">
              {recent.map((t) => {
                const isNow = nowId === t.id;
                return (
                  <li key={t.id} data-track={t.title}>
                    <button type="button" onClick={() => playTrack(t.id, allIds)} aria-label={`Play ${t.title}`} className="block w-full text-center active:scale-95">
                      <Vinyl track={t} spinning={isNow && nowPlaying} className="w-full" tint={accent} />
                      <b className={clsx('mt-1.5 block truncate font-display text-[0.95rem] font-normal', isNow ? 'text-signal' : 'text-bone')}>{t.title}</b>
                      <small className="block truncate font-mono text-[0.62rem] text-bone-faint">{t.artist || 'Unknown artist'}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-4" aria-label="Made for you">
            <Heading eyebrow="Hank DJ" action={dj.busy ? <span className="font-mono text-[0.66rem] text-signal">mixing…</span> : null}>
              Made for <em className="serif-accent">you</em>
            </Heading>
            <ul className="grid grid-cols-2 gap-3 px-5">
              {MOODS.map((m, i) => (
                <li key={m} className={clsx(i % 2 === 1 && 'mt-5')}>
                  <button type="button" onClick={() => void askDj(m)} className="relative flex h-28 w-full flex-col justify-between overflow-hidden rounded-[1.5rem] border border-wash/10 p-3.5 text-left active:scale-[0.97]" style={{ background: auroraOf(m) }}>
                    <span className="font-mono text-[0.56rem] tracking-[0.22em] text-white/70 uppercase">Mix</span>
                    <b className="font-display text-[1.45rem] leading-none font-normal text-white italic">{m}</b>
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); void askDj(); }} className="mx-5 mt-3 flex gap-2">
              <input aria-label="Tell Hank DJ what to play" placeholder="or say it in your own words…" value={dj.text} onChange={(e) => setDj({ ...dj, text: e.target.value })} className="h-12 min-w-0 flex-1 rounded-full border border-wash/12 bg-wash/[0.06] px-5 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" loading={dj.busy} disabled={!dj.text.trim()} className="h-12">
                Play
              </Button>
            </form>
            {(dj.note || dj.error) && <p className={clsx('px-5 font-mono text-fine', dj.error ? 'text-danger' : 'text-bone-dim')} role="status">{dj.error || dj.note}</p>}
          </section>

          {albumItems.length > 0 && (
            <section className="flex flex-col gap-4" aria-label="Your albums">
              <Heading eyebrow="Sleeves">
                Your <em className="serif-accent">albums</em>
              </Heading>
              <ul className="grid grid-cols-3 gap-3 px-5">
                {albumItems.map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => setPage(item.open)} aria-label={`Open ${item.title}`} className="block w-full text-left active:scale-95">
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
            <input type="search" aria-label="Search the library" data-own-clear placeholder="Songs, artists, albums…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-13 w-full rounded-full border border-wash/12 bg-wash/[0.07] pr-11 pl-13 text-body text-bone backdrop-blur placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
            {query && (
              <button type="button" aria-label="Clear the search" onClick={() => setQuery('')} className="absolute top-1/2 right-4 -translate-y-1/2 text-bone-dim">
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
            <section className="flex flex-col gap-4">
              <Heading eyebrow="Browse">
                Every <em className="serif-accent">mood</em>
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
          <div className="flex gap-6 px-5" role="tablist" aria-label="Library shelves">
            {SHELVES.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={shelf === id} onClick={() => setShelf(id)} className={clsx('relative pb-2 font-display text-[1.2rem] transition-colors', shelf === id ? 'text-bone' : 'text-bone-faint')}>
                {label}
                <i className={clsx('absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-signal transition-transform duration-300', shelf === id ? 'scale-x-100' : 'scale-x-0')} aria-hidden="true" />
              </button>
            ))}
          </div>
          {shelf === 'songs' && (
            <div className="-mb-3 flex items-center gap-3 px-5">
              <button type="button" aria-label="Shuffle play" onClick={() => void playList(allIds, { shuffle: true })} className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_10px_24px_-10px_var(--color-signal)] active:scale-95">
                <Shuffle size={19} aria-hidden="true" />
              </button>
              <span className="leading-tight">
                <b className="block font-display text-[1.1rem] font-normal text-bone">Shuffle play</b>
                <small className="font-mono text-[0.68rem] text-bone-faint">{tracks.length} songs</small>
              </span>
            </div>
          )}
          {newPlaylist !== null && (
            <form onSubmit={createList} className="mx-5 flex gap-2">
              <input autoFocus aria-label="New playlist name" placeholder="Name the playlist" value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setNewPlaylist(null)} className="h-12 min-w-0 flex-1 rounded-full border border-wash/12 bg-wash/[0.06] px-5 text-fine text-bone focus-visible:border-signal focus-visible:outline-none" />
              <Button type="submit" size="sm" disabled={!newPlaylist.trim()} className="h-12">
                Create
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
                  <b className="font-display text-[1.08rem] font-normal text-bone">New playlist</b>
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
