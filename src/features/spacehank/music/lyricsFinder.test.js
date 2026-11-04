import { describe, expect, it, vi } from 'vitest';
import { LyricsError, artistNames, cleanTitle, findLyrics, score } from './lyricsFinder';

const json = (body, status = 200, headers = {}) => ({ ok: status < 400, status, headers: { get: (name) => headers[name] ?? null }, json: async () => body });
const record = (extra = {}) => ({ id: 1, trackName: 'Dạo Gần Đây', artistName: 'HIEUTHUHAI', albumName: 'x', duration: 205, instrumental: false, plainLyrics: 'plain words', syncedLyrics: '[00:01.00] timed words', ...extra });
const track = { title: 'Dạo Gần Đây', artist: 'HIEUTHUHAI', album: 'Album', duration: 205.4 };
const sleep = vi.fn().mockResolvedValue();

describe('reading a song\'s name', () => {
  it('drops brackets and a "- Topic" tail from titles and artists', () => {
    expect(cleanTitle('Yêu Một Người Có Lẽ (cover, ft. Hziaa)')).toBe('Yêu Một Người Có Lẽ');
    expect(cleanTitle('Song [Official Video] - Topic')).toBe('Song');
    expect(artistNames('TRiCK - Topic')).toEqual(['trick']);
    expect(artistNames('Low G & JustaTee')).toEqual(['low g', 'justatee']);
    expect(artistNames('Lou Hoàng, Miu Lê ft. X Factor')).toEqual(['lou hoàng', 'miu lê', 'x factor']);
  });
});

describe('scoring a record', () => {
  const wanted = { title: 'Dạo Gần Đây', duration: 205, artists: ['hieuthuhai'] };
  it('likes the right title, length and artist, and prefers timed words', () => {
    expect(score(record(), wanted)).toBe(50 + 30 + 15 + 10);
    expect(score(record({ syncedLyrics: null }), wanted)).toBe(50 + 30 + 15 + 3);
  });
  it('refuses another title, or a cut of the song that is a different length', () => {
    expect(score(record({ trackName: 'Something else' }), wanted)).toBe(0);
    expect(score(record({ duration: 176 }), wanted)).toBe(0);
  });
  it('keeps accents significant, so different Vietnamese words are different songs', () => {
    expect(score(record({ trackName: 'Dao Gan Day' }), wanted)).toBe(0);
  });
});

describe('finding lyrics', () => {
  it('uses the exact signature first, and sends who it is without the audio', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(record()));
    const found = await findLyrics(track, { fetchImpl, sleep });
    expect(found).toMatchObject({ lyrics: '[00:01.00] timed words', synced: true, instrumental: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('https://lrclib.net/api/get?');
    expect(url).toContain('duration=205');
    expect(init.headers['Lrclib-Client']).toMatch(/Hank62/);
  });

  it('falls back to a search and picks the best fitting record', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ statusCode: 404 }, 404))
      .mockResolvedValueOnce(json([record({ id: 7, trackName: 'Dạo Gần Đây (Slowed)', duration: 240 }), record({ id: 8, syncedLyrics: null }), record({ id: 9 })]));
    const found = await findLyrics(track, { fetchImpl, sleep });
    expect(found.from.id).toBe(9);
    expect(found.synced).toBe(true);
  });

  it('takes plain words when that is all there is', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(record({ syncedLyrics: null })));
    expect(await findLyrics(track, { fetchImpl, sleep })).toMatchObject({ lyrics: 'plain words', synced: false });
  });

  it('reports an instrumental, and says nothing found as null', async () => {
    expect(await findLyrics(track, { fetchImpl: vi.fn().mockResolvedValue(json(record({ instrumental: true, plainLyrics: null, syncedLyrics: null }))), sleep })).toMatchObject({ instrumental: true, lyrics: '' });
    const none = vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValue(json([]));
    expect(await findLyrics(track, { fetchImpl: none, sleep })).toBeNull();
  });

  it('searches without the artist when it has none to give, and needs a title', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json([record()]));
    expect(await findLyrics({ title: 'Dạo Gần Đây', duration: 205 }, { fetchImpl, sleep })).toMatchObject({ synced: true });
    expect(fetchImpl.mock.calls[0][0]).toContain('/search?');
    expect(await findLyrics({ title: '   ', artist: 'x' }, { fetchImpl, sleep })).toBeNull();
  });

  it('waits out a short Retry-After once, and gives up on a long one', async () => {
    const waits = vi.fn().mockResolvedValue();
    const slow = vi.fn().mockResolvedValueOnce(json({}, 429, { 'Retry-After': '3' })).mockResolvedValue(json(record()));
    await expect(findLyrics(track, { fetchImpl: slow, sleep: waits })).resolves.toMatchObject({ synced: true });
    expect(waits.mock.calls[0][0]).toBeGreaterThanOrEqual(3000);
    const long = vi.fn().mockResolvedValue(json({}, 429, { 'Retry-After': '600' }));
    await expect(findLyrics(track, { fetchImpl: long, sleep })).rejects.toMatchObject({ kind: 'busy' });
  });

  it('tells "cannot reach it" from "it is busy"', async () => {
    await expect(findLyrics(track, { fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')), sleep })).rejects.toMatchObject({ kind: 'offline' });
    await expect(findLyrics(track, { fetchImpl: vi.fn().mockResolvedValue(json({}, 503)), sleep })).rejects.toBeInstanceOf(LyricsError);
  });
});
