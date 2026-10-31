import { describe, expect, it } from 'vitest';
import { clsx, formatNumber, timeAgo } from './format';

describe('format helpers', () => {
  it('joins truthy class names only', () => {
    expect(clsx('a', false, null, 'b', undefined, '')).toBe('a b');
  });

  it('formats numbers per language', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'vi')).toBe('1.234.567');
  });

  it('describes past times relative to now', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo, 'en')).toBe('2 hours ago');
  });
});
