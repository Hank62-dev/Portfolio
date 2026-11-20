// Small sounds made in the browser with Web Audio, so there are no files to download: a blip (a tone that glides), a chime
// (a few bell-like notes, for something finished) and a whoosh (noise swept down, for a change of place). Each plays into
// `out`, a node of the caller's audio graph, so the caller decides how loud everything is and whether it is on.

/** A short enveloped tone: `from` Hz gliding to `to` Hz over `length` seconds. */
export const blip = (ctx, out, from, to, length, volume, type = 'sine', at = ctx.currentTime) => {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(volume, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);
};

/** Notes (Hz) struck one after another like a little bell: a sine and a quiet octave over it, each ringing out. */
export const chime = (ctx, out, notes = [784, 988, 1319], { gap = 0.075, ring = 0.7, volume = 0.06 } = {}) => {
  const now = ctx.currentTime;
  notes.forEach((freq, i) => {
    const at = now + i * gap;
    blip(ctx, out, freq, freq * 0.998, ring, volume, 'sine', at);
    blip(ctx, out, freq * 2, freq * 1.996, ring * 0.5, volume * 0.25, 'sine', at);
  });
};

/** Filtered noise sweeping from `from` Hz down to `to` Hz over `length` seconds: something moving past. */
export const whoosh = (ctx, out, { length = 0.9, from = 2600, to = 260, volume = 0.12 } = {}) => {
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.15, length * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, now + length);
  src.connect(filter).connect(g).connect(out);
  src.start(now);
};

/** The browser's audio context, made on first need (it only plays after a click or a key press anyway). */
export const makeContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  return Ctor ? new Ctor() : null;
};
