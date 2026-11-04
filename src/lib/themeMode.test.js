import { describe, expect, it } from 'vitest';
import { nextSwitch, resolveTheme } from './themeMode';

const at = (h, m = 0) => new Date(2026, 10, 4, h, m);

describe('the theme mode', () => {
  it('keeps a fixed choice whatever the hour', () => {
    expect(resolveTheme('dark', at(12))).toBe('dark');
    expect(resolveTheme('light', at(2))).toBe('light');
  });

  it('is light by day and dark by night in auto', () => {
    expect(resolveTheme('auto', at(5, 59))).toBe('dark');
    expect(resolveTheme('auto', at(6))).toBe('light');
    expect(resolveTheme('auto', at(17, 59))).toBe('light');
    expect(resolveTheme('auto', at(18))).toBe('dark');
    expect(resolveTheme('auto', at(0))).toBe('dark');
  });

  it('knows when auto will change next', () => {
    expect(nextSwitch(at(3))).toEqual(at(6));
    expect(nextSwitch(at(6))).toEqual(at(18));
    expect(nextSwitch(at(12))).toEqual(at(18));
    expect(nextSwitch(at(20))).toEqual(new Date(2026, 10, 5, 6));
  });
});
