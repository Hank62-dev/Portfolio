import { transcribeAudio } from '../api/owner';
import { tr } from '../lang';

// Turning a recording into text with the server's speech model. The browser's own recording (webm or mp4) is decoded and
// written again as a small WAV (16 kHz, mono, 16 bit: the format every speech model takes), cut into pieces of about two
// and a half minutes so each is well under what the server accepts, and the pieces are sent one after the other.

export const TARGET_RATE = 16000;
export const PIECE_SECONDS = 150; // 150 s of 16 kHz 16-bit mono is 4.8 MB
export const MAX_PIECES = 8; // twenty minutes: a longer memo is refused rather than quietly spending the day's AI budget

/** 16-bit mono WAV (a Blob) from samples between -1 and 1. */
export const wavFromSamples = (samples, rate = TARGET_RATE) => {
  const bytes = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (at, word) => [...word].forEach((ch, i) => bytes.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  bytes.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  bytes.setUint32(16, 16, true); // size of this block
  bytes.setUint16(20, 1, true); // plain PCM
  bytes.setUint16(22, 1, true); // one channel
  bytes.setUint32(24, rate, true);
  bytes.setUint32(28, rate * 2, true); // bytes per second
  bytes.setUint16(32, 2, true); // bytes per sample
  bytes.setUint16(34, 16, true);
  text(36, 'data');
  bytes.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    bytes.setInt16(44 + i * 2, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
};

/** The samples cut into pieces of `seconds` each (the last one shorter). */
export const splitSamples = (samples, rate = TARGET_RATE, seconds = PIECE_SECONDS) => {
  const size = Math.max(1, Math.round(rate * seconds));
  const pieces = [];
  for (let at = 0; at < samples.length; at += size) pieces.push(samples.subarray(at, at + size));
  return pieces;
};

/** Whether a piece is nothing but silence (not worth a call that spends the budget). */
export const isSilent = (samples, threshold = 0.004) => {
  for (let i = 0; i < samples.length; i += 1) if (Math.abs(samples[i]) > threshold) return false;
  return true;
};

/** A recording as 16 kHz mono samples: decoded by the browser, mixed down and resampled by an offline audio context. */
export const decodeTo16k = async (blob) => {
  const Context = window.AudioContext || window.webkitAudioContext;
  const context = new Context();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offline = new Offline(1, Math.max(1, Math.ceil(decoded.duration * TARGET_RATE)), TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    context.close?.();
  }
};

/** The words in a recording. `language` is 'vi' or 'en'. Throws an Error with a sentence the person can read. */
export const transcribeRecording = async (blob, language) => {
  let samples;
  try {
    samples = await decodeTo16k(blob);
  } catch {
    throw new Error(tr('This browser could not read the recording to write it down.'));
  }
  const pieces = splitSamples(samples);
  if (pieces.length > MAX_PIECES) throw new Error(tr('This memo is longer than 20 minutes, which is too long to write down in one go.'));
  const said = [];
  for (const piece of pieces) {
    if (isSilent(piece)) continue;
    const { text } = await transcribeAudio(wavFromSamples(piece), language);
    if (text) said.push(text.trim());
  }
  return said.join('\n\n');
};
