import { describe, expect, it } from 'vitest';
import { flameLevel } from './Flame';

describe('the flame of a streak', () => {
  it('grows from a few days, to a week, to a month', () => {
    expect(flameLevel(1)).toBe(1);
    expect(flameLevel(6)).toBe(1);
    expect(flameLevel(7)).toBe(2);
    expect(flameLevel(29)).toBe(2);
    expect(flameLevel(30)).toBe(3);
    expect(flameLevel(400)).toBe(3);
  });
});
