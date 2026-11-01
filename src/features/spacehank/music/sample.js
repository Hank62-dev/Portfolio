// Sample songs for trying the player without any files of your own. They are original little pieces,
// synthesised right here in the browser (no audio is downloaded and nothing is copyrighted).

export const RATE = 22050;

/** The made-up artists, albums and tracks the sample library is built from. */
export const SAMPLE_TRACKS = [
  { title: 'Neon Rain', artist: 'Aurora Lane', album: 'City Lights', genre: 'synthwave', year: 2024, bpm: 92, root: 57, minor: true, hue: 18 },
  { title: 'Slow Tide', artist: 'Aurora Lane', album: 'City Lights', genre: 'lofi', year: 2024, bpm: 70, root: 53, minor: true, hue: 200 },
  { title: 'Paper Planes', artist: 'Quiet Hours', album: 'Small Rooms', genre: 'indie', year: 2023, bpm: 100, root: 60, minor: false, hue: 48 },
  { title: 'Midnight Commute', artist: 'Quiet Hours', album: 'Small Rooms', genre: 'lofi', year: 2023, bpm: 78, root: 55, minor: true, hue: 262 },
  { title: 'Glass Garden', artist: 'Mono Bloom', album: 'Greenhouse', genre: 'ambient', year: 2025, bpm: 60, root: 50, minor: false, hue: 150 },
  { title: 'Sunday Static', artist: 'Mono Bloom', album: 'Greenhouse', genre: 'ambient', year: 2025, bpm: 66, root: 52, minor: true, hue: 330 },
];

const midiToHz = (note) => 440 * 2 ** ((note - 69) / 12);

// four chords as semitone offsets from the root, for a minor and a major feel
const PROGRESSION = {
  minor: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]],
  major: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
};

/**
 * One loop of music as mono samples in -1..1: a slow bass on each chord and an arpeggio above it. The same
 * input always gives the same output, so a track sounds identical every time it is added.
 */
export const renderTrack = ({ seconds = 20, bpm, root, minor }, rate = RATE) => {
  const out = new Float32Array(Math.floor(seconds * rate));
  const beat = 60 / bpm;
  const chords = PROGRESSION[minor ? 'minor' : 'major'];
  const step = beat / 2; // eighth notes

  const note = (start, hz, length, gain, harmonics) => {
    const from = Math.floor(start * rate);
    const to = Math.min(out.length, Math.floor((start + length) * rate));
    for (let i = from; i < to; i += 1) {
      const t = (i - from) / rate;
      const envelope = Math.min(1, t / 0.012) * Math.exp(-t * (4 / length));
      let v = Math.sin(2 * Math.PI * hz * t);
      if (harmonics) v += 0.35 * Math.sin(4 * Math.PI * hz * t) + 0.12 * Math.sin(6 * Math.PI * hz * t);
      out[i] += v * envelope * gain;
    }
  };

  for (let s = 0; s * step < seconds; s += 1) {
    const time = s * step;
    const chord = chords[Math.floor(time / (beat * 4)) % chords.length];
    const bar = Math.floor(time / (beat * 4)) * beat * 4;
    if (time === bar) note(time, midiToHz(root - 12 + chord[0]), beat * 4, 0.34, false);
    const pattern = [0, 1, 2, 1, 2, 1, 0, 2][s % 8];
    note(time, midiToHz(root + 12 + chord[pattern]), step * 3, 0.17, true);
  }

  // normalise to a comfortable level and fade the ends so a loop does not click
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? 0.6 / peak : 1;
  const fade = Math.floor(rate * 0.6);
  for (let i = 0; i < out.length; i += 1) {
    const edge = Math.min(1, i / fade, (out.length - 1 - i) / fade);
    out[i] *= scale * edge;
  }
  return out;
};

/** 16-bit mono WAV bytes for a block of samples. */
export const encodeWav = (samples, rate = RATE) => {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 32767), true));
  return bytes;
};

/** Lyrics for the first sample, so the synced-lyrics view has something to show. */
export const SAMPLE_LYRICS = [
  '[00:00.50]Streetlights hum in a low blue key',
  '[00:04.00]Rain keeps time on the window glass',
  '[00:08.00]Every neon sign is a sentence',
  '[00:12.00]Written for the ones who pass',
  '[00:16.00]Stay a while, the night is long',
].join('\n');

/** A square cover drawn on a canvas in the track's colour, as a PNG Blob. Browser only. */
export const drawCover = ({ title, artist, hue }) =>
  new Promise((resolve) => {
    const size = 400;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const wash = ctx.createLinearGradient(0, 0, size, size);
    wash.addColorStop(0, `hsl(${hue} 70% 46%)`);
    wash.addColorStop(1, `hsl(${(hue + 50) % 360} 60% 14%)`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(size * 0.78, size * 0.26, 36 + i * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '600 44px "Instrument Serif", Georgia, serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 28, size - 64, size - 56);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '500 20px "Geist Mono", ui-monospace, monospace';
    ctx.fillText(artist.toUpperCase(), 28, size - 30, size - 56);
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
