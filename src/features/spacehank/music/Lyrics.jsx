import { useMemo, useRef, useState } from 'react';
import { Button, Dots } from '../../../design-system';
import { useStore } from '../store';
import { lyricPrefs } from './lyricModes';
import { setLyrics } from './library';
import { estimateLines, parseLrc } from './lrc';
import { seek } from './player';
import { LyricsBar, LyricsStage, PlainLyrics, SyncedLyrics } from './LyricsView';
import { useLyrics } from './useLyrics';
import { tr } from '../lang';

const SAY = {
  none: tr('No lyrics found for this one.'),
  offline: tr('The lyrics service cannot be reached. Are you online?'),
  error: tr('The lyrics service is busy right now.'),
};

const Link = ({ children, ...rest }) => (
  <button type="button" className="font-mono text-[0.72rem] text-bone-faint underline underline-offset-2 hover:text-bone disabled:no-underline disabled:opacity-50" {...rest}>
    {children}
  </button>
);

/**
 * Everything about a song's lyrics in one place: they are looked up on LRCLIB the first time the song is shown; timed ones
 * can be shown in five looks (or on the whole screen), plain ones scroll along with the song; they can be searched again,
 * and a .lrc file can still be attached by hand. `compact` is the phone's card (smaller type for the messages).
 */
export default function Lyrics({ track, time, duration = 0, compact = false }) {
  const { status, find } = useLyrics(track);
  const { mode, size } = useStore(lyricPrefs);
  const [stage, setStage] = useState(false);
  const file = useRef(null);
  const text = String(track?.lyrics ?? '');
  const timed = useMemo(() => parseLrc(text), [text]);
  // lyrics with no times are laid out along the song, so they slide and light up like timed ones (a guess, and said to be)
  const length = duration || track?.duration || 0;
  const guessed = useMemo(() => (timed.length ? [] : estimateLines(text, length)), [timed, text, length]);
  const estimated = timed.length === 0 && guessed.length > 0;
  const lines = estimated ? guessed : timed;
  const seekTo = estimated ? undefined : seek; // a guessed time is not worth jumping the song to
  const hasText = text.trim().length > 0;
  const message = compact ? 'text-fine text-bone-dim' : 'font-display text-h3 leading-tight text-bone-dim';
  const busy = status === 'loading';

  const attach = async (event) => {
    const picked = event.target.files?.[0];
    if (picked && track) await setLyrics(track.id, await picked.text());
    event.target.value = '';
  };
  const input = <input ref={file} type="file" accept=".lrc,text/plain" hidden onChange={attach} />;

  if (!track) return null;

  if (hasText) {
    return (
      <div className="flex flex-col gap-2" data-lyrics={lines.length ? 'synced' : 'plain'}>
        {lines.length ? <SyncedLyrics lines={lines} time={time} mode={mode} size={size} onSeek={seekTo} /> : <PlainLyrics key={track.id} text={text} time={time} duration={length} size={size} />}
        <LyricsBar synced={lines.length > 0} onStage={() => setStage(true)} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {track.lyricsSource === 'lrclib' && <span className="font-mono text-[0.68rem] text-bone-faint">{estimated ? tr('Lyrics') : lines.length ? tr('Timed lyrics') : tr('Lyrics')} {tr('from LRCLIB')}</span>}
          {estimated && <span className="font-mono text-[0.68rem] text-bone-faint" title={tr('This song has no timed lyrics, so the lines are spread along the song')}>{tr('Timing is a guess')}</span>}
          <Link disabled={busy} onClick={() => void find()}>
            {busy ? tr('Searching…') : tr('Search again')}
          </Link>
          <Link onClick={() => file.current?.click()}>{tr('Use a .lrc file')}</Link>
        </div>
        {input}
        {stage && <LyricsStage track={track} lines={lines} text={text} time={time} duration={length} onSeek={seekTo} onClose={() => setStage(false)} />}
      </div>
    );
  }

  if (busy) {
    return (
      <div className="flex items-center gap-3" role="status" data-lyrics="loading">
        <Dots size={6} />
        <p className={message}>{tr('Looking for the lyrics…')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2" data-lyrics={track.instrumental ? 'instrumental' : 'none'}>
      <p className={message}>{track.instrumental ? tr('An instrumental: there are no words.') : SAY[status] ?? SAY.none}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => void find()}>
          {tr('Find lyrics')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>
          {compact ? tr('Add .lrc') : tr('Add lyrics (.lrc)')}
        </Button>
      </div>
      {input}
    </div>
  );
}
