import { HttpError } from '../http/http.mjs';

// The owner's Google Calendar (see services/gcal.mjs), and the calendar the briefing reads.
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
/** The address that opens the Android app on its Calendar (an Android intent link, with the web page as the fallback). */
export const appReturn = (result, page) => `intent://calendar?google=${encodeURIComponent(result)}#Intent;scheme=hank62;package=dev.hank62.app;S.browser_fallback_url=${encodeURIComponent(page)};end`;

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The page the browser tab shows after Google: it opens the app at once, and has a button for when it does not. */
export const appReturnPage = (link, result) => {
  const ok = result === 'connected';
  const title = ok ? 'Đã kết nối Google Calendar' : result === 'denied' ? 'Bạn đã không cho phép' : 'Chưa kết nối được';
  const href = escapeHtml(link);
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${href}"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c0e;color:#ece6da;font:16px system-ui,sans-serif;text-align:center;padding:24px}a{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:999px;background:#ece6da;color:#0b0c0e;text-decoration:none;font-weight:600}p{color:#a39d92}</style></head><body><main><h1 style="font-size:1.3rem">${title}</h1><p>Quay lại app Hank62 để tiếp tục.</p><a href="${href}">Quay về Hank62</a></main></body></html>`;
};

export const calendarRoutes = ({ config, json, redirect, readJson, requireAuth, query, calendar, google }) => ({
  // ---- the owner's Google Calendar (see services/gcal.mjs). Changes are POSTs, so the CORS list stays as short as it is.
  'GET /api/calendar/status': async (req, res) => {
    requireAuth(req);
    json(res, 200, await google.status());
  },

  'POST /api/calendar/google/connect': async (req, res) => {
    requireAuth(req);
    const body = await readJson(req, config.maxBodyBytes).catch(() => ({}));
    json(res, 200, { url: google.authUrl({ app: body?.app === true }) });
  },

  // Google sends the browser here; the signed state proves the sign-in was started by the owner, so no cookie is needed.
  // A sign-in started in the Android app ran in a browser tab (Google refuses sign-in inside a WebView): that tab is sent
  // back to the app (hank62://calendar), with the web page as the fallback when the app is not there.
  'GET /api/calendar/google/callback': async (req, res) => {
    const params = query(req);
    const toApp = google.returnsToApp(params.get('state'));
    const back = (result) => {
      const page = `${config.origin}/spacehank?tab=calendar&google=${result}`;
      if (!toApp) return redirect(res, page);
      // a page rather than a bare redirect: a browser that will not open the app by itself still has a button to tap
      const html = appReturnPage(appReturn(result, page), result);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      return res.end(html);
    };
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
