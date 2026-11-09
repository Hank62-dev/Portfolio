import { useEffect, useState } from 'react';

/** The search delay used across the app: long enough not to search on every key, short enough to feel live. */
export const SEARCH_DELAY = 400;

/**
 * `value`, but only once it has stopped changing for `delay` ms. The input stays bound to the live value (typing is never
 * slowed down); what is searched or filtered follows the debounced one. An empty value comes through at once, so clearing
 * a search clears the results without waiting.
 */
export function useDebounce(value, delay = SEARCH_DELAY) {
  const [settled, setSettled] = useState(value);
  const empty = typeof value === 'string' ? value.trim() === '' : value == null;
  useEffect(() => {
    if (empty) {
      setSettled(value);
      return undefined;
    }
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, empty]);
  return empty ? value : settled;
}
