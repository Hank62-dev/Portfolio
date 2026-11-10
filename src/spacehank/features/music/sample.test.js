import { describe, expect, it } from 'vitest';
import { RATE, SAMPLE_LYRICS, SAMPLE_TRACKS, encodeWav, renderTrack } from './sample';
import { parseLrc } from './lrc';

describe('sample songs', () => {
  it('lists distinct titles on a few albums', () => {
    expect(new Set(SAMPLE_TRACKS.map((t) => t.title)).size).toBe(SAMPLE_TRACKS.length);
    expect(new Set(SAMPLE_TRACKS.map((t) => t.album)).size).toBeGreaterThan(1);
  });

  it('renders audible, bounded audio of the right length, the same way every time', () => {
    const spec = { seconds: 4, bpm: 92, root: 57, minor: true };
    const a = renderTrack(spec);
    const b = renderTrack(spec);
    expect(a).toHaveLength(4 * RATE);
    expect(a.every((v) => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
    expect(Math.max(...a.map(Math.abs))).toBeGreaterThan(0.3);
    expect(a.slice(1000, 1100)).toEqual(b.slice(1000, 1100));
  });

  it('fades in and out so the ends do not click', () => {
    const a = renderTrack({ seconds: 3, bpm: 80, root: 55, minor: false });
    expect(Math.abs(a[0])).toBeLessThan(0.01);
    expect(Math.abs(a[a.length - 1])).toBeLessThan(0.01);
  });

  it('sounds different for a different key', () => {
    const minor = renderTrack({ seconds: 2, bpm: 90, root: 57, minor: true });
    const major = renderTrack({ seconds: 2, bpm: 90, root: 57, minor: false });
    expect(minor.slice(20000, 20100)).not.toEqual(major.slice(20000, 20100));
  });
});

describe('encodeWav', () => {
  it('writes a valid 16-bit mono header that matches the data', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 8000);
    const view = new DataView(wav.buffer);
    const text = (at, n) => String.fromCharCode(...wav.slice(at, at + n));
    expect([text(0, 4), text(8, 4), text(36, 4)]).toEqual(['RIFF', 'WAVE', 'data']);
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint32(40, true)).toBe(8);
    expect(wav).toHaveLength(44 + 8);
    expect(view.getInt16(46, true)).toBe(16384);
    expect(view.getInt16(50, true)).toBe(32767);
  });
});

describe('sample lyrics', () => {
  it('parse into timed lines', () => {
    const lines = parseLrc(SAMPLE_LYRICS);
    expect(lines.length).toBeGreaterThan(3);
    expect(lines.every((l, i) => i === 0 || l.time > lines[i - 1].time)).toBe(true);
  });
});
