import { describe, expect, it } from 'vitest';
import { newFlashcard } from '../model';
import { cardState, clozeFront, clozeParts, deckStats, dueIn, duration, forecast, hasCloze, searchCards, sessionCards, summarize, wrapBlank } from './states';

const now = new Date(2026, 10, 2, 10).getTime();
const DAY = 86400000;
const card = (over = {}) => ({ ...newFlashcard('Q', 'A', '', now), ...over });

describe('card states', () => {
  it('tells new, learning and mature apart', () => {
    expect(cardState(card())).toBe('new');
    expect(cardState(card({ reps: 1, interval: 1, lastReviewed: now }))).toBe('learning');
    expect(cardState(card({ reps: 5, interval: 30, lastReviewed: now }))).toBe('mature');
  });
  it('treats a card that was forgotten again as learning, not new', () => {
    expect(cardState(card({ reps: 0, interval: 0, lastReviewed: now - 1000 }))).toBe('learning');
  });
});

describe('deck stats', () => {
  it('counts the cards by state and the ones due', () => {
    const cards = [card(), card({ due: now + DAY }), card({ reps: 4, interval: 40, lastReviewed: now, due: now - 1 })];
    expect(deckStats(cards, now)).toEqual({ total: 3, due: 2, new: 2, learning: 0, mature: 1 });
  });
});

describe('forecast', () => {
  it('puts what is due now in day one and the rest on their days', () => {
    const cards = [card({ due: now - 5 * DAY }), card({ due: now }), card({ due: now + DAY }), card({ due: now + 3 * DAY }), card({ due: now + 20 * DAY })];
    expect(forecast(cards, 7, now)).toEqual([2, 1, 0, 1, 0, 0, 0]);
  });
});

describe('a session', () => {
  it('takes the due cards, the most overdue first, up to the limit', () => {
    const cards = [card({ front: 'b', due: now - DAY }), card({ front: 'a', due: now - 3 * DAY }), card({ front: 'later', due: now + DAY })];
    expect(sessionCards(cards, { now }).map((c) => c.front)).toEqual(['a', 'b']);
    expect(sessionCards(cards, { now, limit: 1 })).toHaveLength(1);
  });
  it('can look ahead to the cards that come next', () => {
    const cards = [card({ front: 'far', due: now + 9 * DAY }), card({ front: 'near', due: now + DAY })];
    expect(sessionCards(cards, { now, ahead: true }).map((c) => c.front)).toEqual(['near', 'far']);
  });
  it('summarises the answers', () => {
    expect(summarize([0, 2, 2, 3])).toEqual({ total: 4, counts: [1, 0, 2, 1], remembered: 3, accuracy: 75 });
    expect(summarize([]).accuracy).toBe(0);
  });
});

describe('search', () => {
  const cards = [card({ front: 'Café au lait', back: 'milk coffee' }), card({ front: 'Primary key', back: 'unique id' })];
  it('finds words on either side, ignoring case and accents', () => {
    expect(searchCards(cards, 'CAFE')).toHaveLength(1);
    expect(searchCards(cards, 'unique key')).toHaveLength(1);
    expect(searchCards(cards, 'nothing')).toHaveLength(0);
  });
  it('returns everything for an empty search', () => {
    expect(searchCards(cards, '  ')).toHaveLength(2);
  });
});

describe('blanks', () => {
  it('hides the blank on the front and keeps the pieces for the answer', () => {
    expect(hasCloze('The {{heart}} pumps')).toBe(true);
    expect(hasCloze('plain text')).toBe(false);
    expect(clozeFront('The {{heart}} pumps {{blood}}')).toBe('The [...] pumps [...]');
    expect(clozeParts('The {{heart}} pumps')).toEqual([
      { text: 'The ', blank: false },
      { text: 'heart', blank: true },
      { text: ' pumps', blank: false },
    ]);
  });
  it('wraps a selection in a blank', () => {
    expect(wrapBlank('The heart pumps', 4, 9)).toBe('The {{heart}} pumps');
  });
  it('leaves the text alone with no selection or with braces in it', () => {
    expect(wrapBlank('The heart', 3, 3)).toBe('The heart');
    expect(wrapBlank('The {{heart}}', 4, 13)).toBe('The {{heart}}');
  });
});

describe('words for time', () => {
  it('says how long a session took', () => {
    expect(duration(45000)).toBe('45s');
    expect(duration(3 * 60000)).toBe('3 min');
    expect(duration(65 * 60000)).toBe('1 h 05');
  });
  it('says when a card is next due', () => {
    expect(dueIn(now - 1, now)).toBe('now');
    expect(dueIn(now + 10 * 60000, now)).toBe('in 10 min');
    expect(dueIn(now + 3 * 3600000, now)).toBe('in 3 hours');
    expect(dueIn(now + DAY, now)).toBe('tomorrow');
    expect(dueIn(now + 5 * DAY, now)).toBe('in 5 days');
    expect(dueIn(now + 21 * DAY, now)).toBe('in 3 weeks');
  });
});
