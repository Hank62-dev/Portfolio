import { importFiles, library, readRemoved, signature } from './library';

// The names of the audio files (and .lrc lyrics) in src/assets/music, listed at build time by a plugin in vite.config.js.
import names from 'virtual:bundled-music';

const SEEN = 'hank62.music.bundled';
const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN) ?? '{}') ?? {};
  } catch {
    return {};
  }
};
const writeSeen = (seen) => {
  try {
    localStorage.setItem(SEEN, JSON.stringify(seen));
  } catch {
    /* it is only a shortcut: without it the files are checked again */
  }
};

const MIME = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', lrc: 'text/plain' };

/**
 * Copies the songs that ship with the app into this browser's library, once each. A file already in the library, or one
 * the owner deleted, is skipped without being downloaded again. Resolves to how many songs were added.
 */
export const syncBundledMusic = async () => {
  if (!names.length || navigator.connection?.saveData) return 0; // data saver on: do not download the songs
  const have = new Set(library.get().tracks.map((t) => t.sig));
  const removed = readRemoved();
  const seen = readSeen();
  const wanted = [];
  for (const name of names) {
    const known = seen[name];
    if (known && (have.has(known) || removed.has(known))) continue;
    try {
      const response = await fetch(`/music/${encodeURIComponent(name)}`);
      if (!response.ok) continue;
      const blob = await response.blob();
      const file = new File([blob], name, { type: MIME[name.split('.').pop().toLowerCase()] ?? blob.type, lastModified: 0 }); // a fixed date keeps the signature the same on every device
      const sig = signature(file);
      seen[name] = sig;
      if (!have.has(sig) && !removed.has(sig)) wanted.push(file);
    } catch {
      /* offline, or the file went missing: try again next start */
    }
  }
  writeSeen(seen);
  if (!wanted.length) return 0;
  return (await importFiles(wanted)).added;
};
