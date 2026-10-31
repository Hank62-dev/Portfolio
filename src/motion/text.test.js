import { describe, expect, it } from 'vitest';
import { scrambleFrame } from './text';

describe('scrambleFrame', () => {
  it('keeps the settled prefix and scrambles the rest', () => {
    const frame = scrambleFrame('Hello world', 3, () => 0);
    expect(frame.startsWith('Hel')).toBe(true);
    expect(frame).toHaveLength('Hello world'.length);
    expect(frame.slice(3)).not.toContain('l');
  });

  it('never scrambles spaces, so word shapes stay readable', () => {
    expect(scrambleFrame('a b c', 0, () => 0)[1]).toBe(' ');
  });

  it('is the original text once fully settled', () => {
    expect(scrambleFrame('Võ Gia Huy', 10)).toBe('Võ Gia Huy');
  });
});
