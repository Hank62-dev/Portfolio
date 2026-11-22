import { describe, expect, it } from 'vitest';
import { mediaPayload, positionNow, worthSending } from './media';

describe('the media card', () => {
  const position = { duration: 200, position: 50, playbackRate: 1, at: 1000 };

  it('runs the position on while playing, and holds it while paused', () => {
    expect(positionNow(position, 'playing', 11000)).toBe(60);
    expect(positionNow(position, 'paused', 11000)).toBe(50);
    expect(positionNow({ ...position, position: 199 }, 'playing', 11000)).toBe(200);
    expect(positionNow(null, 'playing')).toBe(0);
  });

  it('is gone when nothing is loaded, and describes what is', () => {
    expect(mediaPayload({ metadata: null, state: 'playing', actions: [] }).state).toBe('none');
    const card = mediaPayload({ metadata: { title: 'Song', artist: 'Band', album: 'LP' }, state: 'playing', actions: ['play', 'pause'], position, now: 1000 });
    expect(card).toEqual({ state: 'playing', title: 'Song', artist: 'Band', album: 'LP', duration: 200, position: 50, rate: 1, actions: ['play', 'pause'] });
  });

  it('is told again when what it shows changes or the position drifts, not every second', () => {
    const card = { state: 'playing', title: 'Song', position: 50 };
    expect(worthSending(null, card)).toBe(true);
    expect(worthSending(card, { ...card, position: 51 })).toBe(false);
    expect(worthSending(card, { ...card, position: 80 })).toBe(true);
    expect(worthSending(card, { ...card, state: 'paused' })).toBe(true);
  });
});
