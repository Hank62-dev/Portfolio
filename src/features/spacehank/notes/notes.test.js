import { describe, expect, it } from 'vitest';
import { dayKey, excerpt, journalStreak, journalTemplate, moodSeries, searchNotes, tagsOf, textToHtml, titleOf, tokenize } from './notes';

const note = (id, text, extra = {}) => ({ id, text, createdAt: 1, updatedAt: 1, ...extra });

describe('titleOf', () => {
  it('uses the first line without markdown marks', () => {
    expect(titleOf('# Trip **plan**\n\nbody')).toBe('Trip plan');
    expect(titleOf('\n\n- [ ] call mum')).toBe('[ ] call mum'.replace(/[[\]]/g, '').trim());
  });
  it('falls back to Untitled and clips long lines', () => {
    expect(titleOf('   \n')).toBe('Untitled');
    expect(titleOf('x'.repeat(200))).toHaveLength(80);
  });
});

describe('tagsOf', () => {
  it('finds #tags, once each, lowercased, and not headings or mid-word hashes', () => {
    expect(tagsOf('# Heading\nwork on #Portfolio and #ideas, then #portfolio again, a#b')).toEqual(['portfolio', 'ideas']);
  });
  it('handles Vietnamese tags', () => {
    expect(tagsOf('ghi chú #học-tập')).toEqual(['học-tập']);
  });
});

describe('tokenize', () => {
  it('lowercases, drops accents and one-letter words', () => {
    expect(tokenize('Đi Đà Nẵng, a trip!')).toEqual(['di', 'da', 'nang', 'trip']);
  });
});

describe('searchNotes', () => {
  const notes = [
    note('a', '# Trip plan\nFlight to Da Nang on 12 December, hotel near the beach.', { updatedAt: 3 }),
    note('b', '# Ideas\nBuild a habit tracker. Maybe a trip planner too.', { updatedAt: 2 }),
    note('c', '# Shopping\nmilk, eggs', { updatedAt: 1 }),
  ];

  it('ranks the note with the word in its title first', () => {
    expect(searchNotes(notes, 'trip').map((r) => r.note.id)).toEqual(['a', 'b']);
  });
  it('matches the start of a longer word and ignores accents', () => {
    expect(searchNotes(notes, 'plan')[0].note.id).toBe('a');
    expect(searchNotes(notes, 'đà nẵng')[0].note.id).toBe('a');
  });
  it('returns nothing for nothing, and for words that are not there', () => {
    expect(searchNotes(notes, '')).toEqual([]);
    expect(searchNotes(notes, 'zebra')).toEqual([]);
  });
  it('respects the limit', () => {
    expect(searchNotes(notes, 'a trip', 1)).toHaveLength(1);
  });
});

describe('excerpt', () => {
  it('shows the start when the match is early and the neighbourhood when it is late', () => {
    expect(excerpt('alpha beta gamma', 'alpha', 100)).toBe('alpha beta gamma');
    const text = `${'filler '.repeat(40)}needle sits here and then more words follow after it`;
    const out = excerpt(text, 'needle', 60);
    expect(out.startsWith('…')).toBe(true);
    expect(out).toContain('needle');
  });
});

describe('journal numbers', () => {
  const today = new Date(2026, 10, 2); // 2 Nov 2026
  const entries = [
    note('1', 'j', { day: '2026-11-02', mood: 4 }),
    note('2', 'j', { day: '2026-11-01', mood: 2 }),
    note('3', 'j', { day: '2026-10-30', mood: 5 }),
    note('4', 'no day'),
  ];

  it('formats days in local time', () => {
    expect(dayKey(today)).toBe('2026-11-02');
  });
  it('lays the last days out oldest first with gaps as null', () => {
    const series = moodSeries(entries, 5, today);
    expect(series.map((d) => d.day)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(series.map((d) => d.mood)).toEqual([null, 5, null, 2, 4]);
  });
  it('counts a streak that ends today, or yesterday if today is not written yet', () => {
    expect(journalStreak(entries, today)).toBe(2);
    expect(journalStreak(entries.slice(1), today)).toBe(1);
    expect(journalStreak([], today)).toBe(0);
  });
  it('starts a journal entry with the date and a tag', () => {
    expect(journalTemplate(today)).toContain('#journal');
  });
});

describe('textToHtml', () => {
  it('turns headings, bullets, tasks and lines into editor HTML', () => {
    expect(textToHtml(['# Plan', 'buy milk', '- eggs', '- [x] call mum', '- [ ] pay rent'].join('\n'))).toBe(
      '<h1>Plan</h1><p>buy milk</p><ul><li><p>eggs</p></li></ul><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>call mum</p></li><li data-type="taskItem" data-checked="false"><p>pay rent</p></li></ul>'
    );
  });
  it('escapes markup instead of passing it through', () => {
    expect(textToHtml('<img src=x onerror=alert(1)> & more')).toBe('<p>&lt;img src=x onerror=alert(1)&gt; &amp; more</p>');
  });
  it('gives an empty note one empty paragraph', () => {
    expect(textToHtml('')).toBe('<p></p>');
  });
});
