import { describe, expect, it } from 'vitest';
import { closesSheet } from './useSheetDrag';

describe('closesSheet', () => {
  it('closes when pulled far enough, however slowly', () => {
    expect(closesSheet({ offset: 140, speed: 0 })).toBe(true);
  });

  it('stays open when only pulled a little', () => {
    expect(closesSheet({ offset: 60, speed: 0.1 })).toBe(false);
  });

  it('closes on a quick flick that moved a little', () => {
    expect(closesSheet({ offset: 70, speed: 0.9 })).toBe(true);
  });

  it('does not close on a flick from almost nothing', () => {
    expect(closesSheet({ offset: 12, speed: 2 })).toBe(false);
  });
});
