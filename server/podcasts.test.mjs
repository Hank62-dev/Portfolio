import { describe, expect, it, vi } from 'vitest';
import { createPodcasts, parseFeed, secondsOf } from './podcasts.mjs';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Chuyện &amp; Tiếng Việt</title>
    <itunes:author>Lan Anh</itunes:author>
    <description><![CDATA[<p>Mỗi tuần một <b>câu chuyện</b>.</p>]]></description>
    <itunes:image href="http://img.example/show.jpg"/>
    <item>
      <title>Tập cũ</title>
      <guid isPermaLink="false">old-1</guid>
      <pubDate>Mon, 01 Jan 2024 08:00:00 GMT</pubDate>
      <itunes:duration>1:02:03</itunes:duration>
      <enclosure url="http://cdn.example/old.mp3" length="1000" type="audio/mpeg"/>
    </item>
    <item>
      <title>Tập mới &lt;3</title>
      <guid>new-2</guid>
      <pubDate>Fri, 01 Nov 2024 08:00:00 GMT</pubDate>
      <itunes:duration>754</itunes:duration>
      <itunes:summary><![CDATA[Tóm tắt <i>ngắn</i>]]></itunes:summary>
      <itunes:image href="https://img.example/ep.jpg"/>
      <enclosure url="https://cdn.example/new.mp3?x=1" type="audio/mpeg"/>
    </item>
    <item><title>Không có âm thanh</title><guid>text-only</guid></item>
    <item><title>Địa chỉ lạ</title><enclosure url="javascript:alert(1)" type="audio/mpeg"/></item>
  </channel>
</rss>`;

describe('durations', () => {
  it('reads hours, minutes and plain seconds', () => {
    expect([secondsOf('1:02:03'), secondsOf('12:30'), secondsOf('754'), secondsOf(''), secondsOf('abc'), secondsOf('1:xx')]).toEqual([3723, 750, 754, 0, 0, 0]);
  });
});

describe('a feed', () => {
  const { show, episodes } = parseFeed(FEED, 'https://feed.example/rss');

  it('describes the show in plain text', () => {
    expect(show).toEqual({ feedUrl: 'https://feed.example/rss', title: 'Chuyện & Tiếng Việt', author: 'Lan Anh', image: 'https://img.example/show.jpg', description: 'Mỗi tuần một câu chuyện .' });
  });

  it('lists the episodes newest first, with audio addresses upgraded to https', () => {
    expect(episodes.map((e) => e.title)).toEqual(['Tập mới <3', 'Tập cũ']);
    expect(episodes[0]).toMatchObject({ guid: 'new-2', duration: 754, audio: 'https://cdn.example/new.mp3?x=1', image: 'https://img.example/ep.jpg', description: 'Tóm tắt ngắn' });
    expect(episodes[1]).toMatchObject({ guid: 'old-1', duration: 3723, audio: 'https://cdn.example/old.mp3', image: '' });
    expect(episodes[1].published).toBe(Date.UTC(2024, 0, 1, 8));
  });

  it('leaves out episodes with no audio, or with an address that is not a web address', () => {
    expect(episodes.some((e) => e.guid === 'text-only' || e.title === 'Địa chỉ lạ')).toBe(false);
  });

  it('refuses something that is not a podcast, and does not run a markup bomb', () => {
    expect(() => parseFeed('<html><body>hi</body></html>', 'x')).toThrow('not a podcast feed');
    expect(() => parseFeed('not xml at all', 'x')).toThrow();
    const bomb = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "' + 'x'.repeat(900) + '">' + Array.from({ length: 30 }, (_, i) => `<!ENTITY b${i} "${'&a;'.repeat(50)}">`).join('') + ']]><rss><channel><title>&b1;&b2;&b3;&b4;&b5;&b6;&b7;&b8;</title></channel></rss>';
    const started = Date.now();
    try {
      parseFeed(bomb, 'x');
    } catch {
      /* refused, which is fine */
    }
    expect(Date.now() - started).toBeLessThan(3000); // refused or read, but never ground to a halt
  });

  it('reads a big feed full of ordinary entities (real ones have thousands)', () => {
    const items = Array.from({ length: 400 }, (_, i) => `<item><title>Tập ${i} &amp; bạn &#39;x&#39; &quot;y&quot;</title><guid>g${i}</guid><description>a &amp; b &amp; c &amp; d &amp; e</description><enclosure url="https://cdn.example/${i}.mp3"/></item>`).join('');
    const { episodes } = parseFeed(`<rss><channel><title>Big</title>${items}</channel></rss>`, 'x');
    expect(episodes).toHaveLength(100);
    expect(episodes[0].title).toContain("& bạn 'x' \"y\"");
  });
});

describe('search and feeds through the server', () => {
  const reply = (body, status = 200) => ({ status, type: '', body: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) });

  it('searches the directory, keeping only podcasts that have a feed', async () => {
    const get = vi.fn().mockResolvedValue(
      reply({ results: [{ collectionName: 'Show A', artistName: 'Ann', feedUrl: 'https://a.example/feed', artworkUrl600: 'http://i.example/a.jpg', primaryGenreName: 'News' }, { collectionName: 'No feed', artistName: 'Bob' }, { collectionName: '', feedUrl: 'https://x.example/f' }] })
    );
    const podcasts = createPodcasts({ get });
    const found = await podcasts.search('  show  a ');
    expect(found).toEqual({ results: [{ feedUrl: 'https://a.example/feed', title: 'Show A', author: 'Ann', image: 'https://i.example/a.jpg', genre: 'News' }] });
    expect(get.mock.calls[0][0]).toContain('term=show%20a');
    await podcasts.search('show a'); // the same search is remembered for a while
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('refuses a search that is too short or too long', async () => {
    const podcasts = createPodcasts({ get: vi.fn() });
    await expect(podcasts.search('a')).rejects.toMatchObject({ status: 400 });
    await expect(podcasts.search('x'.repeat(81))).rejects.toMatchObject({ status: 400 });
  });

  it('loads a feed once and remembers it, and forgets it after ten minutes', async () => {
    let clock = 0;
    const get = vi.fn().mockResolvedValue(reply(FEED));
    const podcasts = createPodcasts({ get, now: () => clock });
    expect((await podcasts.feed('https://feed.example/rss')).episodes).toHaveLength(2);
    await podcasts.feed('https://feed.example/rss');
    expect(get).toHaveBeenCalledTimes(1);
    clock = 11 * 60 * 1000;
    await podcasts.feed('https://feed.example/rss');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('says so when the feed is gone or is not an address', async () => {
    const podcasts = createPodcasts({ get: vi.fn().mockResolvedValue(reply('gone', 404)) });
    await expect(podcasts.feed('https://feed.example/rss')).rejects.toMatchObject({ status: 502 });
    await expect(podcasts.feed('file:///etc/passwd')).rejects.toMatchObject({ status: 400 });
    await expect(podcasts.feed('')).rejects.toMatchObject({ status: 400 });
  });
});
