import { describe, expect, it } from 'vitest';
import { dismissToast, pushToast, toneOf, withToast } from './Toast';

describe('what kind a message is', () => {
  it('reads failures as errors', () => {
    expect(toneOf('Realtime server is offline; task was not dispatched')).toBe('error');
    expect(toneOf('Too many attempts. Try again later.')).toBe('error');
    expect(toneOf('The weather could not be loaded.')).toBe('error');
  });
  it('reads confirmations as success', () => {
    expect(toneOf('Connected to the realtime server')).toBe('success');
    expect(toneOf('3 cards added')).toBe('success');
    expect(toneOf('Saved')).toBe('success');
  });
  it('treats anything else as information', () => {
    expect(toneOf('On iPhone: tap Share, then Add to Home Screen')).toBe('info');
  });
});

describe('the list of messages', () => {
  const toast = (id, message) => ({ id, message, tone: 'info', ms: 1000 });
  it('keeps at most three, dropping the oldest', () => {
    let list = [];
    for (let i = 1; i <= 5; i += 1) list = withToast(list, toast(i, `m${i}`));
    expect(list.map((t) => t.message)).toEqual(['m3', 'm4', 'm5']);
  });
  it('shows a repeated message once, as the newest', () => {
    let list = withToast([], toast(1, 'Saved'));
    list = withToast(list, toast(2, 'Other'));
    list = withToast(list, toast(3, 'Saved'));
    expect(list.map((t) => t.id)).toEqual([2, 3]);
  });
});

describe('pushing and dismissing', () => {
  it('ignores an empty message and gives an id to a real one', () => {
    expect(pushToast('   ')).toBe(0);
    const id = pushToast('Something happened', { tone: 'info' });
    expect(id).toBeGreaterThan(0);
    dismissToast(id);
    dismissToast(id); // a second dismiss is harmless
  });
});
