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

/** JSON responder that always carries the CORS headers for the one allowed origin. */
export const createResponder = (origin) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };

  const json = (res, status, data, extraHeaders = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders, ...extraHeaders });
    res.end(JSON.stringify(data));
  };

  const preflight = (res) => {
    res.writeHead(204, corsHeaders);
    res.end();
  };

  return { json, preflight };
};
