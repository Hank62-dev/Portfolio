import { describe, expect, it } from 'vitest';
import { greetingFor, initialsOf, owner } from './config';

describe('spacehank config helpers', () => {
  it('builds initials from the first and last word', () => {
    expect(initialsOf('Võ Gia Huy')).toBe('VH');
    expect(initialsOf('Hank')).toBe('H');
    expect(owner.initials).toBe('VH');
  });

  it('greets by time of day', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(14)).toBe('Good afternoon');
    expect(greetingFor(21)).toBe('Good evening');
  });
});
