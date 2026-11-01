import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Disc3, FolderPlus, Heart, ListMusic, MoonStar, MoreHorizontal, Music2, Pause, Play, Plus, Search, Sparkles, Trash2, Upload, UserRound } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Menu, PageHeader } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { djPick } from '../api/owner';
import { activeLine, parseLrc } from '../music/lrc';
import Cover from '../music/Cover';
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
import { playList, player, playTrack, queueLast, queueNext, setSleepTimer, togglePlay } from '../music/player';
import Visualizer from '../music/Visualizer';
import { storageEstimate } from '../storage';
import { useStore } from '../store';

const TABS = [
  { id: 'songs', label: 'Songs', icon: Music2 },
  { id: 'albums', label: 'Albums', icon: Disc3 },
  { id: 'artists', label: 'Artists', icon: UserRound },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'favorites', label: 'Favorites', icon: Heart },
];

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes > 1e9 ? 0 : 1)} MB`;
const matches = (track, q) => !q || `${track.title} ${track.artist} ${track.album} ${track.genre}`.toLowerCase().includes(q.toLowerCase());

function TrackRow({ track, ids, playlists, inPlaylist, onRemoveFromPlaylist }) {
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
    <li
      className={clsx('group flex items-center gap-3 rounded-sm px-2 py-1.5 transition-colors hover:bg-ink-2', current && 'bg-ink-2')}
      data-track={track.title}
    >
      <button
        type="button"
        onClick={() => (current ? togglePlay() : playTrack(track.id, ids))}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
      >
        <span className="relative">
          <Cover track={track} className="size-10" />
          <span className="absolute inset-0 grid place-items-center rounded-sm bg-ink-0/60 text-bone opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </span>
        </span>
        <span className="min-w-0 leading-tight">
          <b className={clsx('block truncate text-fine font-medium', current ? 'text-signal' : 'text-bone')}>{track.title}</b>
          <small className="block truncate font-mono text-[0.72rem] text-bone-faint">{track.artist || 'Unknown artist'}</small>
        </span>
      </button>
      <span className="w-40 truncate font-mono text-[0.72rem] text-bone-faint max-lg:hidden">{track.album}</span>
      <span className="w-10 text-right font-mono text-[0.72rem] text-bone-faint tabular-nums max-sm:hidden">{formatTime(track.duration)}</span>
      <button
        type="button"
        aria-label={track.favorite ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
        aria-pressed={track.favorite}
        onClick={() => toggleFavorite(track.id)}
        className={clsx('grid size-8 place-items-center rounded-sm transition-colors hover:text-signal', track.favorite ? 'text-signal' : 'text-bone-faint')}
      >
        <Heart size={15} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <Menu
        align="end"
        trigger={
          <button type="button" aria-label={`More for ${track.title}`} className="grid size-8 place-items-center rounded-sm text-bone-faint hover:text-bone">
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
        }
        items={items}
      />
    </li>
  );
}

function NowPlaying() {
  const trackId = useStore(player, (s) => s.trackId);
  const time = useStore(player, (s) => s.time);
  const track = useStore(library, (s) => s.tracks.find((t) => t.id === trackId));
  const playing = useStore(player, (s) => s.playing);
  const sleepAt = useStore(player, (s) => s.sleepAt);
  const lyricsInput = useRef(null);
  const lines = useMemo(() => parseLrc(track?.lyrics), [track?.lyrics]);
  const active = activeLine(lines, time);
  const lyricsBox = useRef(null);

  useEffect(() => {
    const el = lyricsBox.current?.querySelector('[data-active="true"]');
    if (el && lyricsBox.current) lyricsBox.current.scrollTo({ top: el.offsetTop - lyricsBox.current.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [active]);

  if (!track) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <Visualizer height={64} />
        <p className="font-mono text-fine text-bone-faint">Pick a song to start listening.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <Cover track={track} className="aspect-square w-full" />
      <div className="leading-tight">
        <h2 className="font-display text-h3 leading-tight text-bone">{track.title}</h2>
        <p className="mt-1 text-bone-dim">{[track.artist, track.album].filter(Boolean).join(' · ') || 'Unknown artist'}</p>
      </div>
      <Visualizer height={72} />

      <div className="flex items-center gap-2">
        <Menu
          trigger={
            <Button variant="ghost" size="sm" aria-label="Sleep timer">
              <MoonStar size={14} aria-hidden="true" /> {sleepAt ? 'Sleep on' : 'Sleep'}
            </Button>
          }
          items={[
            ...[15, 30, 60].map((m) => ({ id: `s${m}`, label: `Stop after ${m} min`, onSelect: () => setSleepTimer(m) })),
            { id: 'off', label: 'No sleep timer', onSelect: () => setSleepTimer(0) },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => lyricsInput.current?.click()}>
          {lines.length ? 'Replace lyrics' : 'Add lyrics (.lrc)'}
        </Button>
        <input
          ref={lyricsInput}
          type="file"
          accept=".lrc,text/plain"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await setLyrics(track.id, await file.text());
            e.target.value = '';
          }}
        />
      </div>

      {lines.length > 0 && (
        <div ref={lyricsBox} className="relative max-h-56 overflow-y-auto rounded-sm bg-ink-2 p-3" aria-label="Lyrics" tabIndex={0}>
          {lines.map((line, i) => (
            <p
              key={`${line.time}-${i}`}
              data-active={i === active}
              className={clsx('py-0.5 transition-colors duration-300', i === active ? 'font-medium text-bone' : 'text-bone-faint')}
            >
              {line.text || ' '}
            </p>
          ))}
        </div>
      )}
      {playing && <Badge tone="signal" dot>PLAYING</Badge>}
    </Card>
  );
}

export default function MusicView() {
  const { loaded, tracks, playlists, error } = useStore(library);
  const [tab, setTab] = useState('songs');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(null); // { kind: 'album' | 'artist' | 'playlist', key }
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState('');
  const [usage, setUsage] = useState(null);
  const [mood, setMood] = useState('');
  const [dj, setDj] = useState({ busy: false, note: '', error: '' });
  const [newPlaylist, setNewPlaylist] = useState('');
  const filePicker = useRef(null);
  const folderPicker = useRef(null);

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

  const visible = useMemo(() => {
    let list = tracks;
    if (tab === 'favorites') list = list.filter((t) => t.favorite);
    if (focus?.kind === 'album') list = list.filter((t) => (t.album || '') === focus.key);
    if (focus?.kind === 'artist') list = list.filter((t) => (t.artist || '') === focus.key);
    if (focus?.kind === 'playlist') {
      const ids = playlists.find((p) => p.id === focus.key)?.trackIds ?? [];
      list = ids.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);
    }
    return list.filter((t) => matches(t, query));
  }, [tracks, playlists, tab, focus, query]);
  const ids = useMemo(() => visible.map((t) => t.id), [visible]);

  const hasSamples = useMemo(() => tracks.some((t) => t.sample), [tracks]);
  const [sampling, setSampling] = useState(false);
  const trySamples = async () => {
    setSampling(true);
    const added = await addSamples();
    setSampling(false);
    setNotice(added ? `${added} sample songs added. They are original and made in your browser.` : 'The sample songs are already here.');
  };

  const ask = async (event) => {
    event.preventDefault();
    if (!mood.trim() || dj.busy) return;
    setDj({ busy: true, note: '', error: '' });
    try {
      const pick = await djPick({
        mood,
        tracks: tracks.map((t) => ({ id: t.id, title: t.title, artist: t.artist, genre: t.genre })),
      });
      if (!pick.ids.length) throw new Error('Nothing in your library fits that. Try other words.');
      await playList(pick.ids);
      setDj({ busy: false, note: pick.note, error: '' });
    } catch (e) {
      setDj({ busy: false, note: '', error: e.message });
    }
  };

  const showGroups = !focus && (tab === 'albums' || tab === 'artists');
  const showPlaylists = !focus && tab === 'playlists';
  const groups = useMemo(() => (showGroups ? groupTracks(tracks.filter((t) => matches(t, query)), tab === 'albums' ? 'album' : 'artist') : []), [showGroups, tracks, tab, query]);
  const title = focus?.kind === 'playlist' ? playlists.find((p) => p.id === focus.key)?.name : focus?.key || (focus ? 'Unknown' : null);

  return (
    <div
      className="relative flex flex-col gap-6"
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
      <PageHeader
        eyebrow="PRIVATE LIBRARY"
        title={
          <>
            Hank <em>Music.</em>
          </>
        }
        description="Your own songs, kept on this device. Nothing is uploaded, and nobody else can hear them."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => folderPicker.current?.click()}>
              <FolderPlus size={15} aria-hidden="true" /> Add folder
            </Button>
            <Button size="sm" onClick={() => filePicker.current?.click()}>
              <Upload size={15} aria-hidden="true" /> Add songs
            </Button>
            <input ref={filePicker} type="file" multiple accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.lrc" hidden data-file-input onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />
            <input ref={folderPicker} type="file" multiple webkitdirectory="" hidden onChange={(e) => { void add([...e.target.files]); e.target.value = ''; }} />
          </>
        }
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-card border-2 border-dashed border-signal bg-ink-0/80 font-mono text-bone">
          Drop songs (and .lrc lyrics) to add them
        </div>
      )}

      {(progress || notice || error) && (
        <p className="font-mono text-fine text-bone-dim" role="status">
          {progress ? `Reading ${progress.done + 1} of ${progress.total}: ${progress.name}` : error || notice}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="flex min-h-[420px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Library">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => {
                    setTab(id);
                    setFocus(null);
                  }}
                  className={clsx('inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-fine transition-colors', tab === id ? 'bg-ink-3 text-bone' : 'text-bone-dim hover:text-bone')}
                >
                  <Icon size={14} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto min-w-40 flex-1 sm:max-w-64">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-bone-faint" aria-hidden="true" />
              <Input aria-label="Search the library" placeholder="Search songs, artists…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <form onSubmit={ask} className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-ink-2 p-2">
            <Sparkles size={15} className="ml-1 text-signal" aria-hidden="true" />
            <Input
              aria-label="Tell Hank DJ what to play"
              placeholder="Hank DJ: late-night coding, rainy focus, something upbeat…"
              className="min-w-48 flex-1 border-transparent bg-transparent"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              disabled={!tracks.length}
            />
            <Button type="submit" size="sm" loading={dj.busy} disabled={!mood.trim() || !tracks.length}>
              Play a mix
            </Button>
            {(dj.note || dj.error) && (
              <p className={clsx('basis-full px-1 font-mono text-fine', dj.error ? 'text-danger' : 'text-bone-dim')} role="status">
                {dj.error || dj.note}
              </p>
            )}
          </form>

          {focus && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFocus(null)}>
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </Button>
              <h2 className="font-display text-h3 text-bone">{title}</h2>
              {focus.kind === 'playlist' && (
                <Button variant="danger" size="sm" className="ml-auto" onClick={() => { void deletePlaylist(focus.key); setFocus(null); }}>
                  Delete playlist
                </Button>
              )}
              {visible.length > 0 && (
                <Button size="sm" className={focus.kind === 'playlist' ? '' : 'ml-auto'} onClick={() => playList(ids)}>
                  <Play size={14} aria-hidden="true" /> Play all
                </Button>
              )}
            </div>
          )}

          {!loaded ? (
            <p className="font-mono text-fine text-bone-faint">Opening your library…</p>
          ) : !tracks.length ? (
            <EmptyState
              icon={Music2}
              title="Your library is empty"
              description="Drag songs here, or use Add songs. Tags and cover art are read from the files, and everything stays in this browser."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => filePicker.current?.click()}>
                    Add songs
                  </Button>
                  <Button variant="ghost" size="sm" loading={sampling} onClick={trySamples}>
                    <Sparkles size={14} aria-hidden="true" /> Try with sample songs
                  </Button>
                </div>
              }
            />
          ) : showPlaylists ? (
            <div className="flex flex-col gap-3">
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newPlaylist.trim()) return;
                  await createPlaylist(newPlaylist);
                  setNewPlaylist('');
                }}
              >
                <Input aria-label="New playlist name" placeholder="New playlist name" value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} />
                <Button type="submit" size="sm" disabled={!newPlaylist.trim()}>
                  <Plus size={14} aria-hidden="true" /> Create
                </Button>
              </form>
              {playlists.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {playlists.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setFocus({ kind: 'playlist', key: p.id })} className="flex w-full items-center gap-3 rounded-sm border border-line p-3 text-left hover:border-line-strong">
                        <ListMusic size={18} className="text-signal" aria-hidden="true" />
                        <span className="leading-tight">
                          <b className="block text-fine font-medium">{p.name}</b>
                          <small className="font-mono text-[0.72rem] text-bone-faint">{p.trackIds.length} songs</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-mono text-fine text-bone-faint">No playlists yet. Create one, or use "Add to a new playlist" on any song.</p>
              )}
            </div>
          ) : showGroups ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <li key={g.key || 'none'}>
                  <button type="button" onClick={() => setFocus({ kind: tab === 'albums' ? 'album' : 'artist', key: g.key })} className="flex w-full items-center gap-3 rounded-sm border border-line p-2.5 text-left hover:border-line-strong">
                    <Cover track={g.coverId ? { id: g.coverId, hasCover: true } : null} className="size-14" />
                    <span className="min-w-0 leading-tight">
                      <b className="block truncate text-fine font-medium">{g.title || 'Unknown'}</b>
                      <small className="block truncate font-mono text-[0.72rem] text-bone-faint">{[g.subtitle, `${g.trackIds.length} songs`].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : visible.length ? (
            <ul className="flex flex-col" aria-label="Songs">
              {visible.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  ids={ids}
                  playlists={playlists}
                  inPlaylist={focus?.kind === 'playlist'}
                  onRemoveFromPlaylist={() => removeFromPlaylist(focus.key, track.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="font-mono text-fine text-bone-faint">{tab === 'favorites' ? 'No favorites yet. Tap the heart on a song.' : 'Nothing matches that search.'}</p>
          )}
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <NowPlaying />
          <Card>
            <CardHeader eyebrow="ON THIS DEVICE" title="Library" />
            <p className="font-mono text-fine text-bone-dim">
              {tracks.length} songs · {playlists.length} playlists
              {usage ? ` · ${megabytes(usage.used)} of ${megabytes(usage.quota)} used` : ''}
            </p>
            {hasSamples ? (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => removeSamples()}>
                <Trash2 size={14} aria-hidden="true" /> Remove the sample songs
              </Button>
            ) : (
              tracks.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-3" loading={sampling} onClick={trySamples}>
                  <Sparkles size={14} aria-hidden="true" /> Add sample songs
                </Button>
              )
            )}
            <p className="mt-2 font-mono text-[0.72rem] text-bone-faint">
              Clearing this site's data in the browser removes the library. The files stay private: only titles go to Hank DJ, never audio.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
