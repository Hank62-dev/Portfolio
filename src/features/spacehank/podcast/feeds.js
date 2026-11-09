import { podcastFeed } from '../api/owner';

// The feeds read this session, kept for a while: going back to a show, or to the library's "new episodes", is then instant
// and does not ask the server again. Two asks for the same feed at once share one request.

const FRESH = 10 * 60 * 1000;
const cache = new Map(); // feedUrl -> { at, promise, data }

/** A feed's { show, episodes }: from the cache while it is fresh, else from the server. */
export const loadFeed = (feedUrl, { fresh = false } = {}) => {
  const hit = cache.get(feedUrl);
  if (hit && !fresh && Date.now() - hit.at < FRESH) return hit.promise;
  const entry = { at: Date.now(), data: hit?.data ?? null };
  entry.promise = podcastFeed(feedUrl).then(
    (data) => {
      entry.data = data;
      return data;
    },
    (error) => {
      if (cache.get(feedUrl) === entry) cache.delete(feedUrl);
      throw error;
    }
  );
  cache.set(feedUrl, entry);
  return entry.promise;
};

/** What is already known of a feed, to show at once while a fresher copy loads. */
export const knownFeed = (feedUrl) => cache.get(feedUrl)?.data ?? null;
