import { describe, expect, it } from 'vitest';
import { asNote, bars, canTranscribe, formatDuration, titleFrom } from './model';

describe('memos', () => {
  it('formats a length', () => {
    expect([0, 5, 65, 3599.6].map(formatDuration)).toEqual(['0:00', '0:05', '1:05', '60:00']);
  });
  it('titles a memo from its first words, or from the time', () => {
    expect(titleFrom('remember to call mum about the trip on Sunday evening please')).toBe('remember to call mum about the trip…');
    expect(titleFrom('short idea')).toBe('short idea');
    expect(titleFrom('', new Date(2026, 10, 2, 9, 5).getTime())).toMatch(/^Memo /);
  });
  it('knows whether speech to text exists', () => {
    expect(canTranscribe({})).toBe(false);
    expect(canTranscribe({ webkitSpeechRecognition: function Fake() {} })).toBe(true);
  });
  it('turns a memo into a tagged note, with or without words', () => {
    expect(asNote({ title: 'Idea', transcript: 'a habit garden' })).toBe('Idea\n#voice\na habit garden');
    expect(asNote({ title: 'Idea', transcript: '' })).toContain('No transcript');
  });
  it('summarises volume samples into bars of a fixed number', () => {
    expect(bars([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
    expect(bars([], 3)).toEqual([0.04, 0.04, 0.04]);
    expect(bars(Array(100).fill(0.5), 10)).toHaveLength(10);
  });
});
