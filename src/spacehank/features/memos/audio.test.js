import { describe, expect, it } from 'vitest';
import { PIECE_SECONDS, TARGET_RATE, isSilent, splitSamples, wavFromSamples } from './audio';

const bytesOf = async (blob) => new DataView(await blob.arrayBuffer());
const word = (view, at, length) => String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(at + i)));

describe('the WAV a recording becomes', () => {
  it('has the header a speech model expects: 16 kHz, mono, 16 bit', async () => {
    const wav = wavFromSamples(new Float32Array([0, 0.5, -0.5, 1, -1]));
    expect(wav.type).toBe('audio/wav');
    expect(wav.size).toBe(44 + 5 * 2);
    const view = await bytesOf(wav);
    expect(word(view, 0, 4)).toBe('RIFF');
    expect(word(view, 8, 4)).toBe('WAVE');
    expect(word(view, 12, 4)).toBe('fmt ');
    expect(view.getUint32(4, true)).toBe(36 + 10);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(TARGET_RATE);
    expect(view.getUint32(28, true)).toBe(TARGET_RATE * 2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(word(view, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(10);
  });

  it('writes the samples at full scale and clips what is louder', async () => {
    const view = await bytesOf(wavFromSamples(new Float32Array([0, 0.5, -0.5, 1, -1, 2, -3])));
    const sample = (i) => view.getInt16(44 + i * 2, true);
    expect([sample(0), sample(1), sample(2), sample(3), sample(4), sample(5), sample(6)]).toEqual([0, 16383, -16384, 32767, -32768, 32767, -32768]);
  });
});

describe('cutting a long recording', () => {
  it('splits it into pieces of at most two and a half minutes, keeping every sample', () => {
    const samples = new Float32Array(TARGET_RATE * (PIECE_SECONDS * 2 + 30));
    const pieces = splitSamples(samples);
    expect(pieces.map((p) => p.length / TARGET_RATE)).toEqual([PIECE_SECONDS, PIECE_SECONDS, 30]);
    expect(splitSamples(new Float32Array(10))).toHaveLength(1);
    expect(splitSamples(new Float32Array(0))).toHaveLength(0);
  });

  it('recognises silence, so a quiet piece does not spend a call', () => {
    expect(isSilent(new Float32Array(1000))).toBe(true);
    expect(isSilent(new Float32Array(1000).fill(0.001))).toBe(true);
    const spoken = new Float32Array(1000);
    spoken[500] = 0.2;
    expect(isSilent(spoken)).toBe(false);
  });
});
