import { describe, expect, it, vi } from 'vitest';
import { backoffMs, isNoNetwork, rememberSignedIn, wasSignedIn } from './useRealtime';

describe('the pause before reconnecting', () => {
  const none = () => 0;
  it('doubles from one second and stops at twenty', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 12].map((n) => backoffMs(n, none))).toEqual([1000, 2000, 4000, 8000, 16000, 20000, 20000, 20000]);
  });
  it('adds a little spread so many phones do not come back at the same instant', () => {
    expect(backoffMs(0, () => 0.99)).toBeGreaterThan(1000);
    expect(backoffMs(0, () => 0.99)).toBeLessThan(1400);
  });
});

describe('opening with no network', () => {
  it('counts a failed fetch or an offline device as no network, not a server still waking up', () => {
    expect(isNoNetwork(new TypeError('Failed to fetch'), true)).toBe(true);
    expect(isNoNetwork(new Error('Server not ready (503)'), false)).toBe(true);
    expect(isNoNetwork(new Error('Server not ready (503)'), true)).toBe(false);
  });

  it('remembers that this device was signed in, until it is signed out', () => {
    const kept = new Map();
    vi.stubGlobal('localStorage', { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, String(v)), removeItem: (k) => kept.delete(k) });
    rememberSignedIn(true);
    expect(wasSignedIn()).toBe(true);
    rememberSignedIn(false);
    expect(wasSignedIn()).toBe(false);
    vi.unstubAllGlobals();
  });
});
