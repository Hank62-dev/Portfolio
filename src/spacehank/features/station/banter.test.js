import { describe, expect, it } from 'vitest';
import { SCRIPTS, linesOf, moodOf, pickTalk } from './banter';

const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('the crew talking', () => {
  it('needs two free crew members', () => {
    expect(pickTalk([], Math.random)).toBeNull();
    expect(pickTalk(['nova'], Math.random)).toBeNull();
  });

  it('pairs two different people', () => {
    for (let n = 0; n < 50; n++) {
      const talk = pickTalk(['nova', 'pixel', 'atlas'], Math.random);
      expect(talk.pair[0]).not.toBe(talk.pair[1]);
      expect(talk.script).toBeGreaterThanOrEqual(0);
      expect(talk.script).toBeLessThan(SCRIPTS.length);
    }
  });

  it('does not tell the same scene twice in a row', () => {
    const talk = pickTalk(['nova', 'pixel'], seq(0, 0, 0), 0);
    expect(talk.script).toBe(1);
  });

  it('gives every line a speaker and a listener from the pair, both of them speaking', () => {
    SCRIPTS.forEach((_, script) => {
      const lines = linesOf({ pair: ['nova', 'pixel'], script }, (id) => id);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      lines.forEach((line) => {
        expect(['nova', 'pixel']).toContain(line.by);
        expect(line.to).not.toBe(line.by);
        expect(line.text.length).toBeGreaterThan(0);
      });
      expect(new Set(lines.map((l) => l.by)).size).toBe(2);
    });
  });

  it('names the one spoken to', () => {
    const lines = linesOf({ pair: ['nova', 'pixel'], script: 0 }, (id) => id.toUpperCase());
    expect(lines[0].text).toContain('PIXEL');
  });
});

describe('the mood over a head', () => {
  it('follows the status', () => {
    expect(moodOf('nova', 'busy').kind).toBe('busy');
    expect(moodOf('nova', 'done').kind).toBe('happy');
    expect(moodOf('nova', 'failed').kind).toBe('sad');
    expect(moodOf('nova', 'offline').kind).toBe('sleep');
    expect(moodOf('nova', 'idle').kind).toBe('idle');
  });

  it('keeps an idle mood for a while and changes it later', () => {
    expect(moodOf('nova', 'idle', 3)).toEqual(moodOf('nova', 'idle', 3));
    const seen = new Set(Array.from({ length: 20 }, (_, slot) => moodOf('nova', 'idle', slot).icon));
    expect(seen.size).toBeGreaterThan(1);
  });
});
