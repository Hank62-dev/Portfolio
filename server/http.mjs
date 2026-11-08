export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Reads a JSON object body, refusing anything larger than `limit` bytes. */
export const readJson = (req, limit) =>
  new Promise((resolve, reject) => {
    let size = 0;
    let chunks = [];
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks = [];
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on('error', reject);
    req.on('end', () => {
      if (tooLarge) return reject(new HttpError(413, 'Request body is too large'));
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
        return resolve(parsed);
      } catch {
        return reject(new HttpError(400, 'Invalid JSON'));
      }
    });
  });

/** Reads a raw body (a picture or a recording), refusing anything larger than `limit` bytes. */
export const readBytes = (req, limit) =>
  new Promise((resolve, reject) => {
    let size = 0;
    let chunks = [];
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks = [];
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on('error', reject);
    req.on('end', () => (tooLarge ? reject(new HttpError(413, 'That file is too large to sync.')) : resolve(Buffer.concat(chunks))));
  });

/**
 * The address of whoever is asking. Behind Render's proxy the socket is the proxy, and the proxy appends the address it saw
 * to X-Forwarded-For, so the entries that count are the last ones: anything before them was written by the client itself and
 * could be made up to dodge a rate limit. `hops` is how many proxies stand in front of the server (each adds one entry).
 */
export const clientKey = (req, hops = 1) => {
  const entries = String(req.headers['x-forwarded-for'] ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length) return entries[Math.max(0, entries.length - Math.max(1, hops))];
  return req.socket?.remoteAddress || 'unknown';
};

// What every answer says about itself, so a browser does not guess: it is data (nosniff), not a page that may be framed or
// that may run anything (CSP), it is not to be kept (no-store, except the files that say otherwise), and the page that asked
// is not told where it came from when it follows a link (referrer). HTTPS only, for a year (HSTS).
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

/** JSON responder that always carries the CORS headers for the one allowed origin, and the security headers. */
export const createResponder = (origin) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    Vary: 'Origin',
    ...SECURITY_HEADERS,
  };

  const json = (res, status, data, extraHeaders = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", ...corsHeaders, ...extraHeaders });
    res.end(JSON.stringify(data));
  };

  /** A binary answer (a stored picture or recording). */
  const bytes = (res, status, data, mime) => {
    // a stored file is shown by the app as a picture or a sound: whatever it claims to be, a browser opening its address must not run it
    res.writeHead(status, { 'Content-Type': mime, 'Content-Length': data.length, 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'attachment', ...corsHeaders });
    res.end(data);
  };

  /** Sends the browser on to another address (back to the app after Google's sign-in). */
  const redirect = (res, location) => {
    res.writeHead(302, { Location: location, 'Cache-Control': 'no-store', ...corsHeaders });
    res.end();
  };

  const preflight = (res) => {
    res.writeHead(204, corsHeaders);
    res.end();
  };

  return { json, bytes, redirect, preflight };
};
