import { describe, expect, it } from 'vitest';
import { resolveKey, typing } from './shortcuts';

describe('shortcuts', () => {
  it('goes somewhere with g then a letter', () => {
    expect(resolveKey('g', null)).toEqual({ wait: 'g' });
    expect(resolveKey('m', 'g')).toEqual({ go: 'music' });
    expect(resolveKey('H', 'g')).toEqual({ go: 'hank' });
    expect(resolveKey('z', 'g')).toBeNull();
  });

  it('knows the single keys', () => {
    expect(resolveKey('?', null)).toEqual({ run: 'help' });
    expect(resolveKey('f', null)).toEqual({ run: 'focus' });
    expect(resolveKey('.', null)).toEqual({ run: 'mini' });
    expect(resolveKey('x', null)).toBeNull();
  });

  it('stays quiet while typing', () => {
    const field = { closest: (sel) => (sel.includes('input') ? {} : null) };
    expect(typing(field)).toBe(true);
    expect(typing({ closest: () => null })).toBe(false);
    expect(typing(null)).toBe(false);
  });
});
