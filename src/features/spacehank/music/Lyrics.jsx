import { useMemo, useRef } from 'react';
import { Button, Dots } from '../../../design-system';
import { activeLine, parseLrc } from './lrc';
import { setLyrics } from './library';
import { Ribbon } from './parts';
import { useLyrics } from './useLyrics';

const SAY = {
  none: 'No lyrics found for this one.',
  offline: 'The lyrics service cannot be reached. Are you online?',
  error: 'The lyrics service is busy right now.',
};

/** Lyrics without times are plain text you scroll; timed ones are a ribbon that follows the song. */
function PlainLyrics({ text }) {
  return (
    <div className="max-h-[300px] overflow-y-auto py-3 font-display text-lead leading-relaxed whitespace-pre-line text-bone [mask-image:linear-gradient(transparent,#000_8%,#000_92%,transparent)]" aria-label="Lyrics" tabIndex={0} data-plain-lyrics>
      {text}
    </div>
  );
}

const Link = ({ children, ...rest }) => (
  <button type="button" className="font-mono text-[0.72rem] text-bone-faint underline underline-offset-2 hover:text-bone disabled:no-underline disabled:opacity-50" {...rest}>
    {children}
  </button>
);

/**
 * Everything about a song's lyrics in one place: they are looked up on LRCLIB the first time the song is shown, can be searched
 * again, and a .lrc file can still be attached by hand. `compact` is the phone's card (smaller type for the messages).
 */
export default function Lyrics({ track, time, compact = false }) {
  const { status, find } = useLyrics(track);
  const file = useRef(null);
  const text = String(track?.lyrics ?? '');
  const lines = useMemo(() => parseLrc(text), [text]);
  const active = activeLine(lines, time);
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
        {lines.length ? <Ribbon lines={lines} active={active} /> : <PlainLyrics text={text} />}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {track.lyricsSource === 'lrclib' && <span className="font-mono text-[0.68rem] text-bone-faint">{lines.length ? 'Timed lyrics' : 'Lyrics'} from LRCLIB</span>}
          <Link disabled={busy} onClick={() => void find()}>
            {busy ? 'Searching…' : 'Search again'}
          </Link>
          <Link onClick={() => file.current?.click()}>Use a .lrc file</Link>
        </div>
        {input}
      </div>
    );
  }

  if (busy) {
    return (
      <div className="flex items-center gap-3" role="status" data-lyrics="loading">
        <Dots size={6} />
        <p className={message}>Looking for the lyrics…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2" data-lyrics={track.instrumental ? 'instrumental' : 'none'}>
      <p className={message}>{track.instrumental ? 'An instrumental: there are no words.' : SAY[status] ?? SAY.none}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => void find()}>
          Find lyrics
        </Button>
        <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>
          {compact ? 'Add .lrc' : 'Add lyrics (.lrc)'}
        </Button>
      </div>
      {input}
    </div>
  );
}
