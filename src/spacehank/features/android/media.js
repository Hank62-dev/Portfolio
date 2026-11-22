import { isNativeApp } from '../../../shared/lib/platform';
import { Hank62 } from './bridge';

// Music, podcasts and the focus timer already describe themselves through navigator.mediaSession (what plays, whether it
// plays, where it is, and what each button does). A WebView shows none of that, and Android may stop an app in the
// background. So inside the app navigator.mediaSession is stood in for by an object that keeps what the players say and
// hands it to the phone (MediaService.java: the media card, the lock screen, headset buttons, and a foreground service that
// keeps the audio going with the screen off); a button pressed there calls the player's own handler. No player changes.

const DRIFT = 2; // seconds the phone's own estimate of the position may be off before it is told again

const largest = (artwork = []) => {
  const size = (item) => Number(String(item?.sizes ?? '0').split('x')[0]) || 0;
  return [...artwork].sort((a, b) => size(b) - size(a))[0]?.src ?? '';
};

/** Where the media is now, from the last position state (it runs on by itself while playing). */
export const positionNow = (position, state, now = Date.now()) => {
  if (!position) return 0;
  const run = state === 'playing' ? ((now - position.at) / 1000) * (position.playbackRate || 1) : 0;
  return Math.max(0, Math.min(position.duration || Infinity, (position.position || 0) + run));
};

/** What the phone is told, from what the players said. Pure. */
export const mediaPayload = ({ metadata, state, actions, position, now = Date.now() }) => ({
  state: metadata ? state || 'paused' : 'none',
  title: metadata?.title ?? '',
  artist: metadata?.artist ?? '',
  album: metadata?.album ?? '',
  duration: position?.duration ?? 0,
  position: positionNow(position, state, now),
  rate: position?.playbackRate || 1,
  actions,
});

/** Does the phone need telling: something it shows changed, or its estimate of the position has drifted. */
export const worthSending = (previous, next) => {
  if (!previous) return true;
  const { position: a, ...restA } = previous;
  const { position: b, ...restB } = next;
  return JSON.stringify(restA) !== JSON.stringify(restB) || Math.abs(a - b) > DRIFT;
};

const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/** Puts the stand-in in place. Called once, before any player starts (src/app/main.jsx). Does nothing outside the app. */
export const installMediaBridge = () => {
  if (!isNativeApp() || typeof navigator === 'undefined') return;
  if (typeof window.MediaMetadata === 'undefined') {
    window.MediaMetadata = class MediaMetadata {
      constructor(init = {}) {
        this.title = init.title ?? '';
        this.artist = init.artist ?? '';
        this.album = init.album ?? '';
        this.artwork = init.artwork ?? [];
      }
    };
  }
  const real = 'mediaSession' in navigator ? navigator.mediaSession : null;
  const handlers = new Map();
  let metadata = null;
  let state = 'none';
  let position = null;
  let told = null; // what the phone last heard, as the phone estimates it now
  let toldAt = 0;
  let art = { src: '', data: '', sent: true };
  let timer = 0;

  const flush = () => {
    const now = Date.now();
    const next = mediaPayload({ metadata, state, actions: [...handlers.keys()], position, now });
    const estimate = told && told.state === 'playing' ? { ...told, position: told.position + ((now - toldAt) / 1000) * told.rate } : told;
    const artChanged = !art.sent;
    if (!artChanged && !worthSending(estimate, next)) return;
    told = next;
    toldAt = now;
    art.sent = true;
    // the cover goes only when it changes: it can be large, and the rest is sent every few seconds
    void Hank62.media(artChanged ? { ...next, art: art.data } : next).catch(() => {});
  };
  const send = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 120);
  };

  // the cover, as data the phone can read (a player's cover may be a blob: address only this page knows)
  const resolveArt = async () => {
    const src = largest(metadata?.artwork);
    if (src === art.src) return;
    art = { src, data: '', sent: false };
    if (!src) return send();
    try {
      const blob = await (await fetch(src)).blob();
      const data = blob.size < 1.5 * 1024 * 1024 ? await toDataUrl(blob) : '';
      if (art.src !== src) return undefined;
      art = { src, data, sent: false };
    } catch {
      /* a cover from a site that will not share it: the card goes without */
    }
    return send();
  };

  const session = {
    get metadata() {
      return metadata;
    },
    set metadata(value) {
      metadata = value;
      try {
        if (real) real.metadata = value;
      } catch {
        /* the WebView's own session refused it */
      }
      void resolveArt();
      send();
    },
    get playbackState() {
      return state;
    },
    set playbackState(value) {
      state = value;
      try {
        if (real) real.playbackState = value;
      } catch {
        /* as above */
      }
      send();
    },
    setActionHandler(action, handler) {
      if (handler) handlers.set(action, handler);
      else handlers.delete(action);
      try {
        real?.setActionHandler(action, handler);
      } catch {
        /* an action the WebView does not know: the phone's card still has it */
      }
      send();
    },
    setPositionState(value) {
      position = value ? { ...value, at: Date.now() } : null;
      try {
        real?.setPositionState?.(value);
      } catch {
        /* out of range for the WebView */
      }
      send();
    },
    setCameraActive() {},
    setMicrophoneActive() {},
  };
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, get: () => session });

  void Hank62.addListener('mediaAction', ({ action, seekTime }) => {
    // a headset's single button says play/pause; a swiped-away card says stop, which a player without one reads as pause
    const handler = handlers.get(action) ?? (action === 'stop' ? handlers.get('pause') : null);
    handler?.({ action, seekTime });
  });
};
