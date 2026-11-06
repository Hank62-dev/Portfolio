import { describe, expect, it } from 'vitest';
import { RATES, clock, listenRecord, startAt, fraction, hashId, isFinished, lengthWords, listenId, nextRate, progressOf, publishedLabel, rateLabel, showId, unfinished } from './model';

describe('ids', () => {
  it('are stable, different for different texts, and safe to use as a record id', () => {
    expect(hashId('https://feed.example/rss')).toBe(hashId('https://feed.example/rss'));
    expect(hashId('a')).not.toBe(hashId('b'));
    expect(hashId('Tập 1: Xin chào')).toMatch(/^[0-9a-z]+$/);
    expect(showId('https://feed.example/rss')).toMatch(/^show-[0-9a-z]+$/);
    expect(listenId('show-x', 'guid-1')).not.toBe(listenId('show-x', 'guid-2'));
    expect(listenId('show-x', 'guid-1')).not.toBe(listenId('show-y', 'guid-1'));
  });
});

describe('time', () => {
  it('writes a clock with hours only when there are some', () => {
    expect([clock(0), clock(9), clock(75), clock(754), clock(3723), clock(-5), clock('x')]).toEqual(['0:00', '0:09', '1:15', '12:34', '1:02:03', '0:00', '0:00']);
  });

  it('says how long an episode is in words', () => {
    expect([lengthWords(20), lengthWords(45 * 60), lengthWords(3600), lengthWords(65 * 60)]).toEqual(['', '45 min', '1 h', '1 h 5 min']);
  });

  it('labels the day an episode came out', () => {
    const now = Date.UTC(2026, 10, 7, 12);
    const day = 86400000;
    expect([publishedLabel(now - 3600000, now), publishedLabel(now - day, now), publishedLabel(now - 3 * day, now), publishedLabel(0, now)]).toEqual(['Today', 'Yesterday', '3 days ago', '']);
    expect(publishedLabel(Date.UTC(2026, 8, 1), now)).toMatch(/1|Sep/);
    expect(publishedLabel(Date.UTC(2024, 8, 1), now)).toContain('2024');
  });
});

describe('how far an episode has got', () => {
  it('is finished when nearly over, never when the length is unknown', () => {
    expect(isFinished(1790, 1800)).toBe(true);
    expect(isFinished(1700, 1800)).toBe(false);
    expect(isFinished(97, 100)).toBe(true); // 97 per cent is as good as the end, on a short one
    expect(isFinished(500, 0)).toBe(false);
  });

  it('turns a record into a fraction', () => {
    expect(fraction({ position: 450, duration: 900 })).toBe(0.5);
    expect(fraction({ position: 5000, duration: 900 })).toBe(1);
    expect(fraction({ done: true, position: 0, duration: 900 })).toBe(1);
    expect(fraction(null)).toBe(0);
    expect(fraction({ position: 10 })).toBe(0);
  });

  it('finds the record of an episode', () => {
    const records = [{ id: listenId('s', 'g1'), position: 40 }];
    expect(progressOf(records, 's', 'g1')).toBe(records[0]);
    expect(progressOf(records, 's', 'g2')).toBeNull();
  });

  it('offers what was left half-heard, most recent first, skipping what is done or barely started', () => {
    const entries = [
      { id: 'a', position: 100, at: 1, audio: 'x', done: false },
      { id: 'b', position: 300, at: 3, audio: 'x', done: false },
      { id: 'c', position: 500, at: 2, audio: 'x', done: true },
      { id: 'd', position: 5, at: 4, audio: 'x', done: false },
      { id: 'e', position: 200, at: 5, audio: '', done: false },
    ];
    expect(unfinished(entries).map((e) => e.id)).toEqual(['b', 'a']);
    expect(unfinished(entries, 1).map((e) => e.id)).toEqual(['b']);
  });
});

describe('speed', () => {
  it('goes round the list', () => {
    expect(RATES).toContain(1);
    expect(nextRate(1)).toBe(1.25);
    expect(nextRate(2)).toBe(RATES[0]);
    expect(nextRate(1.1)).toBe(1.25);
    expect(rateLabel(1.25)).toBe('1.25×');
    expect(rateLabel(1)).toBe('1×');
  });
});

describe('the record kept for an episode', () => {
  const show = { id: 'show-1', title: 'Chuyện', image: 'https://img/show.jpg' };
  const episode = { guid: 'g1', title: 'Tập 1', audio: 'https://cdn/1.mp3', duration: 1800, image: '' };

  it('keeps what is needed to carry on, and falls back to the feed’s length and the show’s picture', () => {
    expect(listenRecord({ show, episode, time: 120.7, duration: 0, at: 9 })).toEqual({ id: listenId('show-1', 'g1'), show: 'show-1', guid: 'g1', title: 'Tập 1', showTitle: 'Chuyện', image: 'https://img/show.jpg', audio: 'https://cdn/1.mp3', duration: 1800, position: 120, done: false, at: 9 });
    expect(listenRecord({ show, episode, time: 100, duration: 600 }).duration).toBe(600);
  });

  it('marks it done when it ended or is nearly over', () => {
    expect(listenRecord({ show, episode, time: 100, duration: 1800, done: true }).done).toBe(true);
    expect(listenRecord({ show, episode, time: 1790, duration: 1800 }).done).toBe(true);
    expect(listenRecord({ show, episode, time: 100, duration: 1800 }).done).toBe(false);
  });

  it('starts a little before where it was left, or at the beginning', () => {
    expect(startAt({ position: 100, done: false })).toBe(97);
    expect(startAt({ position: 3, done: false })).toBe(0);
    expect(startAt({ position: 900, done: true })).toBe(0);
    expect(startAt(null)).toBe(0);
  });
});
