import ical from 'node-ical';
import { HttpError } from '../http/http.mjs';

const CACHE_MS = 5 * 60 * 1000;
const MAX_EVENTS = 25;

/**
 * Reads the owner's calendar from a secret ICS feed (Google Calendar's "secret address in iCal format"). The
 * feed URL is the credential, so it lives only in the server's environment and is never sent to the browser.
 */
export const createCalendar = ({ url, fetchImpl = fetch, now = Date.now }) => {
  let cached = null;

  const load = async () => {
    if (cached && now() - cached.at < CACHE_MS) return cached.data;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new HttpError(502, 'The calendar feed could not be read');
    const data = ical.sync.parseICS(await response.text());
    cached = { at: now(), data };
    return data;
  };

  /** Events that overlap [from, to], soonest first. */
  const between = async (from, to) => {
    if (!url) return { configured: false, events: [] };
    if (!(from instanceof Date) || !(to instanceof Date) || Number.isNaN(+from) || Number.isNaN(+to) || to <= from) {
      throw new HttpError(400, 'A valid from/to range is required');
    }
    if (to - from > 3 * 24 * 60 * 60 * 1000) throw new HttpError(400, 'Range is too long');

    let data;
    try {
      data = await load();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'The calendar feed could not be read');
    }

    const events = [];
    for (const item of Object.values(data)) {
      if (item.type !== 'VEVENT') continue;
      const instances = ical.expandRecurringEvent(item, { from, to, includeOverrides: true, excludeExdates: true, expandOngoing: true });
      for (const instance of instances) {
        events.push({
          title: String(instance.summary || item.summary || 'Untitled').slice(0, 140),
          start: instance.start.toISOString(),
          end: instance.end.toISOString(),
          allDay: Boolean(instance.isFullDay),
          location: item.location ? String(item.location).slice(0, 140) : '',
        });
      }
    }
    events.sort((a, b) => a.start.localeCompare(b.start));
    return { configured: true, events: events.slice(0, MAX_EVENTS) };
  };

  return { between, configured: Boolean(url) };
};
