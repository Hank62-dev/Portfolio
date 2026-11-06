import { vi as vitest } from 'vitest';

// these tests check the Vietnamese text, so the workspace is put in Vietnamese before anything is imported
vitest.hoisted(() => {
  globalThis.__HANK_LANG__ = 'vi';
});

import { describe, expect, it } from 'vitest';
import { describeLockError, hideLocked } from './lock';

const notes = [
  { id: 'a', text: 'a plain note' },
  { id: 'b', day: '2026-11-03', text: 'a diary page' },
  { id: 'c', text: 'another plain note' },
];

describe('hiding the diary', () => {
  it('leaves the diary pages out while locked, and only those', () => {
    expect(hideLocked(notes, true).map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('shows everything when it is open', () => {
    expect(hideLocked(notes, false)).toBe(notes);
  });

  it('copes with no notes', () => {
    expect(hideLocked([], true)).toEqual([]);
  });
});

describe('what to say when the phone says no', () => {
  it('has a plain sentence for each way it can fail', () => {
    expect(describeLockError({ name: 'NotAllowedError' })).toMatch(/Chưa xác thực/);
    expect(describeLockError({ name: 'InvalidStateError' })).toMatch(/đã được tạo/);
    expect(describeLockError({ name: 'NotSupportedError' })).toMatch(/chưa hỗ trợ/);
    expect(describeLockError({ name: 'SecurityError' })).toMatch(/https/);
    expect(describeLockError(new Error('who knows'))).toMatch(/Không dùng được/);
    expect(describeLockError(undefined)).toMatch(/Không dùng được/);
  });
});
