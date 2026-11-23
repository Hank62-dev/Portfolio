import { describe, expect, it } from 'vitest';
import { fileId, keptList, share, sizeLabel } from './offline';

describe('an episode kept on the phone', () => {
  it('gets a file name of safe letters only, the same every time and different for another episode', () => {
    const a = fileId('show-1:abc/def?x=1');
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).toBe(fileId('show-1:abc/def?x=1'));
    expect(a).not.toBe(fileId('show-1:abc/def?x=2'));
    expect(fileId('x'.repeat(500)).length).toBeLessThanOrEqual(120);
  });

  it('shows how far its download is, and its size', () => {
    expect(share(25, 100)).toBe(0.25);
    expect(share(10, -1)).toBe(0);
    expect(share(200, 100)).toBe(1);
    expect(sizeLabel(48_200_000)).toBe('48 MB');
    expect(sizeLabel(200_000)).toBe('1 MB');
    expect(sizeLabel(1_500_000_000)).toBe('1.5 GB');
  });

  it('is listed newest first', () => {
    expect(keptList({ a: { key: 'a', at: 1 }, b: { key: 'b', at: 3 }, c: { key: 'c', at: 2 } }).map((item) => item.key)).toEqual(['b', 'c', 'a']);
  });
});
