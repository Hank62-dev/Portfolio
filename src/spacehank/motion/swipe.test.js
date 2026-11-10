import { describe, expect, it } from 'vitest';
import { SWIPE_DONE, swipeAxis, swipeOffset, swipeOutcome, swipeProgress } from './swipe';
import { easeOutQuart } from './hooks';

describe('a swipe on a row', () => {
  it('is done only when it went far enough to the right', () => {
    expect(swipeOutcome(SWIPE_DONE - 1)).toBe('back');
    expect(swipeOutcome(SWIPE_DONE)).toBe('done');
    expect(swipeOutcome(-300)).toBe('back');
  });

  it('is left to the page when it is mostly vertical, and waits while it is tiny', () => {
    expect(swipeAxis(2, 3)).toBeNull();
    expect(swipeAxis(30, 4)).toBe('x');
    expect(swipeAxis(6, 40)).toBe('y');
    expect(swipeAxis(20, 20)).toBe('y'); // a diagonal is a scroll, not a swipe
  });

  it('follows the finger to the right, gets heavier, and never goes left or too far', () => {
    expect(swipeOffset(-40)).toBe(0);
    expect(swipeOffset(40)).toBeGreaterThan(30);
    expect(swipeOffset(40)).toBeLessThan(40);
    expect(swipeOffset(5000)).toBeLessThanOrEqual(160);
  });

  it('reports how close it is to the point of no return', () => {
    expect(swipeProgress(0)).toBe(0);
    expect(swipeProgress(SWIPE_DONE / 2)).toBeCloseTo(0.5);
    expect(swipeProgress(SWIPE_DONE * 3)).toBe(1);
  });
});

describe('easing', () => {
  it('starts at 0, ends at 1 and moves fast at first', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect(easeOutQuart(0.25)).toBeGreaterThan(0.6);
    expect(easeOutQuart(2)).toBe(1);
  });
});
