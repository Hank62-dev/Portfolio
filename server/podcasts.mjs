import { XMLParser } from 'fast-xml-parser';
import { HttpError } from './http.mjs';
import { safeGet } from './safeFetch.mjs';

// Podcasts for the owner's player. A podcast is an RSS feed that lists episodes, each with the address of an audio file.
// A browser cannot read most feeds itself (they do not allow other sites to), so the server reads them and hands the app
// a short, clean list. The audio itself never passes through here: the app plays the file straight from its host.

const SEARCH = 'https://itunes.apple.com/search';
const CACHE_MS = 10 * 60 * 1000;
const MAX_CACHE = 40;
const MAX_EPISODES = 100;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  htmlEntities: true,
  // a feed is somebody else's text: its entities may not expand into something huge (but a real feed of hundreds of episodes has thousands of plain &amp; and &#39;)
  processEntities: { enabled: true, maxEntitySize: 1000, maxExpansionDepth: 5, maxTotalExpansions: 500000, maxExpandedLength: 4 * 1024 * 1024 },
});

const list = (value) => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);
const str = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return str(value['#text']);
  return String(value);
};
const clean = (value, max) =>
  str(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** 'https' for an address that may be shown or played by the app: anything else is dropped, and plain http is upgraded. */
const secure = (value) => {
  const text = str(value).trim();
  if (!/^https?:\/\//i.test(text) || text.length > 2000) return '';
  return text.replace(/^http:\/\//i, 'https://');
};

/** '1:02:03', '12:30' or '754' as seconds. */
export const secondsOf = (value) => {
  const text = str(value).trim();
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  return Math.round(parts.reduce((total, n) => total * 60 + n, 0));
};

/** A feed's XML as { show, episodes }, newest episode first. Throws a 502 for something that is not a podcast feed. */
export const parseFeed = (xml, feedUrl) => {
  let channel;
  try {
    channel = parser.parse(xml)?.rss?.channel;
  } catch {
    throw new HttpError(502, 'That feed could not be read.');
  }
  channel = list(channel)[0];
  if (!channel) throw new HttpError(502, 'That address is not a podcast feed.');

  const show = {
    feedUrl,
    title: clean(channel.title, 160) || 'Untitled podcast',
    author: clean(channel['itunes:author'] ?? channel.author, 120),
    image: secure(channel['itunes:image']?.['@_href'] ?? channel.image?.url),
    description: clean(channel.description ?? channel['itunes:summary'], 500),
  };

  const episodes = list(channel.item)
    .map((item) => {
      const enclosure = list(item.enclosure)[0];
      const audio = secure(enclosure?.['@_url']);
      if (!audio) return null;
      const published = Date.parse(str(item.pubDate));
      return {
        guid: clean(item.guid, 300) || audio,
        title: clean(item.title, 200) || 'Untitled episode',
        published: Number.isFinite(published) ? published : 0,
        duration: secondsOf(item['itunes:duration']),
        audio,
        image: secure(item['itunes:image']?.['@_href']),
        description: clean(item['itunes:summary'] ?? item.description ?? item['content:encoded'], 600),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.published - a.published)
    .slice(0, MAX_EPISODES);

  return { show, episodes };
};

export const createPodcasts = ({ get = safeGet, now = Date.now } = {}) => {
  const cache = new Map();
  const remember = (key, value) => {
    cache.set(key, { at: now(), value });
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return value;
  };
  const recall = (key) => {
    const hit = cache.get(key);
    return hit && now() - hit.at < CACHE_MS ? hit.value : null;
  };

  /** Podcasts matching a name, from Apple's public directory. */
  const search = async (term) => {
    const wanted = String(term ?? '').replace(/\s+/g, ' ').trim();
    if (wanted.length < 2) throw new HttpError(400, 'Type at least two letters to search.');
    if (wanted.length > 80) throw new HttpError(400, 'That search is too long.');
    const key = `search:${wanted.toLowerCase()}`;
    const hit = recall(key);
    if (hit) return hit;
    const response = await get(`${SEARCH}?media=podcast&entity=podcast&limit=20&term=${encodeURIComponent(wanted)}`, { accept: 'application/json', maxBytes: 1024 * 1024 });
    let data;
    try {
      data = JSON.parse(response.body.toString('utf8'));
    } catch {
      throw new HttpError(502, 'The podcast directory sent something unreadable.');
    }
    const results = list(data?.results)
      .map((entry) => ({
        feedUrl: /^https?:\/\//i.test(str(entry.feedUrl)) ? str(entry.feedUrl) : '',
        title: clean(entry.collectionName ?? entry.trackName, 160),
        author: clean(entry.artistName, 120),
        image: secure(entry.artworkUrl600 ?? entry.artworkUrl100),
        genre: clean(entry.primaryGenreName, 40),
      }))
      .filter((entry) => entry.feedUrl && entry.title);
    return remember(key, { results });
  };

  /** The episodes of a podcast, from its own feed. */
  const feed = async (url) => {
    const address = String(url ?? '').trim();
    if (!/^https?:\/\//i.test(address) || address.length > 2000) throw new HttpError(400, 'That is not a podcast address.');
    const hit = recall(`feed:${address}`);
    if (hit) return hit;
    const response = await get(address, { accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5', maxBytes: 4 * 1024 * 1024 });
    if (response.status >= 400) throw new HttpError(502, 'That podcast could not be loaded right now.');
    return remember(`feed:${address}`, parseFeed(response.body.toString('utf8'), address));
  };

  return { search, feed };
};
