import { describe, expect, it } from 'vitest';
import { parseDraft } from './draft';

const raw = (patch = {}) => JSON.stringify({ day: '2026-11-03', mood: 4, body: 'dở dang', photos: ['p1'], at: 1000, ...patch });

describe('a draft', () => {
  it('comes back for its own day', () => {
    expect(parseDraft(raw(), '2026-11-03', 2000)).toEqual({ mood: 4, body: 'dở dang', photos: ['p1'] });
  });

  it('is not offered for another day, or when it is old', () => {
    expect(parseDraft(raw(), '2026-11-04', 2000)).toBeNull();
    expect(parseDraft(raw(), '2026-11-03', 1000 + 3 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it('copes with nothing, with garbage and with odd fields', () => {
    expect(parseDraft(null, '2026-11-03')).toBeNull();
    expect(parseDraft('not json', '2026-11-03')).toBeNull();
    expect(parseDraft(raw({ mood: undefined, body: undefined, photos: 'x' }), '2026-11-03', 2000)).toEqual({ mood: null, body: '', photos: [] });
    expect(parseDraft(raw({ photos: ['a', 3, null] }), '2026-11-03', 2000).photos).toEqual(['a']);
  });
});
