import { describe, expect, it } from 'vitest';
import { describeShare, firstLink, hasContent, hostOf, noteFromShare, tidyShare } from './compose';

describe('links', () => {
  it('finds the first link and drops punctuation that followed it', () => {
    expect(firstLink('look at https://example.com/a?b=1, nice')).toBe('https://example.com/a?b=1');
    expect(firstLink('(see http://x.org/page.)')).toBe('http://x.org/page');
    expect(firstLink('no link here')).toBe('');
    expect(firstLink(undefined)).toBe('');
  });

  it('names where a link points', () => {
    expect(hostOf('https://www.example.com/path')).toBe('example.com');
    expect(hostOf('not a url')).toBe('');
  });
});

describe('tidyShare', () => {
  it('pulls the link out of the text, as Chrome on Android sends it', () => {
    expect(tidyShare({ title: 'Great read', text: 'Great read https://example.com/post' })).toEqual({
      title: 'Great read',
      text: '',
      url: 'https://example.com/post',
    });
  });

  it('keeps an explicit url and leaves the text alone', () => {
    expect(tidyShare({ title: 'T', text: 'see also https://other.com', url: 'https://example.com' })).toEqual({
      title: 'T',
      text: 'see also https://other.com',
      url: 'https://example.com',
    });
  });

  it('copes with nothing at all and with Windows line endings', () => {
    expect(tidyShare()).toEqual({ title: '', text: '', url: '' });
    expect(tidyShare({ text: 'a\r\nb' }).text).toBe('a\nb');
  });
});

describe('noteFromShare', () => {
  it('builds a heading, the words and the link', () => {
    expect(noteFromShare({ title: 'Great read', text: 'Worth keeping', url: 'https://example.com' })).toBe('# Great read\n\nWorth keeping\n\nhttps://example.com');
  });

  it('does not say the same thing twice when the text only repeats the title', () => {
    expect(noteFromShare({ title: 'Great read', text: 'Great read https://example.com/post' })).toBe('# Great read\n\nhttps://example.com/post');
  });

  it('is empty when there is nothing', () => {
    expect(noteFromShare({})).toBe('');
    expect(noteFromShare({ title: '  ', text: '\n' })).toBe('');
  });

  it('keeps plain text as it came', () => {
    expect(noteFromShare({ text: 'buy milk\nand eggs' })).toBe('buy milk\nand eggs');
  });
});

describe('describing a share', () => {
  it('says what arrived', () => {
    expect(describeShare({ text: 'see https://www.example.com/x' })).toBe('example.com');
    expect(describeShare({ text: 'just words' })).toBe('some text');
    expect(describeShare({}, 2)).toBe('2 pictures');
    expect(describeShare({ url: 'https://a.com' }, 1)).toBe('a.com and a picture');
    expect(describeShare({})).toBe('nothing');
  });

  it('knows when there is something to save', () => {
    expect(hasContent({})).toBe(false);
    expect(hasContent({}, 1)).toBe(true);
    expect(hasContent({ url: 'https://a.com' })).toBe(true);
  });
});
