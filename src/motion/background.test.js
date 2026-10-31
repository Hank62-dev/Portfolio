import { describe, expect, it } from 'vitest';
import { looksSane } from './BackgroundField';

describe('background shader sanity check', () => {
  it('accepts the dark and light backgrounds', () => {
    expect(looksSane([12, 13, 15, 255], false)).toBe(true);
    expect(looksSane([243, 238, 229, 255], true)).toBe(true);
  });

  it('rejects a blown-out white frame on the dark theme (the bug this guards against)', () => {
    expect(looksSane([255, 255, 255, 255], false)).toBe(false);
  });

  it('rejects a black or grey frame on the light theme', () => {
    expect(looksSane([0, 0, 0, 255], true)).toBe(false);
    expect(looksSane([120, 118, 112, 255], true)).toBe(false);
  });
});
