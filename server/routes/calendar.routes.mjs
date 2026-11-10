import { HttpError } from '../http/http.mjs';

// The owner's Google Calendar (see services/gcal.mjs), and the calendar the briefing reads.
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const calendarRoutes = ({ config, json, redirect, readJson, requireAuth, query, calendar, google }) => ({
  // ---- the owner's Google Calendar (see gcal.mjs). Changes are POSTs, so the CORS list stays as short as it is.
  'GET /api/calendar/status': async (req, res) => {
    requireAuth(req);
    json(res, 200, await google.status());
  },

  'POST /api/calendar/google/connect': (req, res) => {
    requireAuth(req);
    json(res, 200, { url: google.authUrl() });
  },

  // Google sends the browser here; the signed state proves the sign-in was started by the owner, so no cookie is needed.
  'GET /api/calendar/google/callback': async (req, res) => {
    const params = query(req);
    const back = (result) => redirect(res, `${config.origin}/spacehank?tab=calendar&google=${result}`);
    if (params.get('error')) return back('denied');
    try {
      await google.connect({ code: params.get('code'), state: params.get('state') });
      return back('connected');
    } catch (error) {
      if (!(error instanceof HttpError)) console.error('Google sign-in failed:', error);
      return back('failed');
    }
  },

  'POST /api/calendar/google/disconnect': async (req, res) => {
    requireAuth(req);
    json(res, 200, await google.disconnect());
  },

  'POST /api/calendar/google/select': async (req, res) => {
    requireAuth(req);
    const body = await readJson(req, config.maxBodyBytes);
    json(res, 200, { calendars: await google.select(body.ids) });
  },

  'GET /api/calendar/events': async (req, res) => {
    requireAuth(req);
    const params = query(req);
    json(res, 200, { events: await google.range(new Date(params.get('from') ?? ''), new Date(params.get('to') ?? '')) });
  },

  'POST /api/calendar/events/create': async (req, res) => {
    requireAuth(req);
    json(res, 201, await google.create(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/calendar/events/update': async (req, res) => {
    requireAuth(req);
    json(res, 200, await google.update(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/calendar/events/delete': async (req, res) => {
    requireAuth(req);
    json(res, 200, await google.remove(await readJson(req, config.maxBodyBytes)));
  },

  'GET /api/briefing/calendar': async (req, res) => {
    requireAuth(req);
    const { searchParams } = new URL(req.url, 'http://localhost');
    json(res, 200, await calendar.between(new Date(searchParams.get('from') ?? ''), new Date(searchParams.get('to') ?? '')));
  },
});
