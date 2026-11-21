import { describe, expect, it } from 'vitest';
import { isLow } from './battery';

describe('low battery', () => {
  it('saves power only on the battery with a fifth or less left', () => {
    expect(isLow({ charging: false, level: 0.15 })).toBe(true);
    expect(isLow({ charging: false, level: 0.2 })).toBe(true);
    expect(isLow({ charging: false, level: 0.5 })).toBe(false);
    expect(isLow({ charging: true, level: 0.05 })).toBe(false);
    expect(isLow({})).toBe(false);
  });
});
