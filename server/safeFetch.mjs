import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';
import { HttpError } from './http.mjs';

// Fetching an address that somebody else chose (a podcast's feed) from the server's own network is how a server gets used
// to reach what it should not: its own admin pages, the cloud's metadata service, other machines beside it. So every
// connection is checked when it is made: the address the name really points to must be a public one. A redirect is
// followed only after the same check, a body is cut off at a size, and the whole thing has a time limit.

/** Whether an IP address (v4 or v6) belongs to the public internet, not to this machine or a private network. */
export const isPublicAddress = (address) => {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
    if (a === 169 && b === 254) return false; // link-local, and the cloud metadata address
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 0 && c === 0) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a >= 224) return false; // multicast, reserved, broadcast
    return true;
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPublicAddress(mapped[1]);
    if (lower === '::' || lower === '::1') return false;
    if (/^f[cd]/.test(lower)) return false; // unique local
    if (/^fe[89ab]/.test(lower)) return false; // link-local
    if (/^ff/.test(lower)) return false; // multicast
    if (lower.startsWith('64:ff9b:')) return false; // translation prefix
    if (lower.startsWith('2001:db8')) return false; // documentation
    return true;
  }
  return false;
};

/** A DNS lookup that refuses to hand out anything but public addresses (used as the connection's own `lookup`). */
export const publicOnlyLookup = (lookup = dns.lookup) => (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const allowed = addresses.filter((entry) => isPublicAddress(entry.address));
    if (!allowed.length) return callback(Object.assign(new Error('That address is not public.'), { code: 'EBLOCKED' }));
    if (options?.all) return callback(null, allowed);
    return callback(null, allowed[0].address, allowed[0].family);
  });
};

const DECODERS = { gzip: zlib.createGunzip, deflate: zlib.createInflate, br: zlib.createBrotliDecompress };

/**
 * Gets a web address and returns { status, url, type, body (Buffer) }. Throws an HttpError with a sentence for the person.
 * `allowPrivate` is for tests that talk to a server on this machine; nothing else sets it.
 */
export const safeGet = (input, { maxBytes = 3 * 1024 * 1024, timeoutMs = 10000, maxRedirects = 4, accept = '*/*', allowPrivate = false, lookup } = {}) => {
  const check = (value) => {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new HttpError(400, 'That is not a web address.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new HttpError(400, 'Only http and https addresses can be read.');
    if (url.username || url.password) throw new HttpError(400, 'An address with a password in it cannot be read.');
    if (!allowPrivate && url.port && !['80', '443'].includes(url.port)) throw new HttpError(400, 'That port cannot be read.');
    if (!allowPrivate && net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ''))) throw new HttpError(400, 'That address is not public.');
    return url;
  };

  const deadline = Date.now() + timeoutMs;

  const once = (url) =>
    new Promise((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const request = client.request(
        url,
        {
          method: 'GET',
          headers: { 'user-agent': 'Hank62-Podcasts/1.0', accept, 'accept-encoding': 'gzip, deflate, br' },
          lookup: allowPrivate ? undefined : publicOnlyLookup(lookup),
          timeout: Math.max(1000, deadline - Date.now()),
        },
        (response) => {
          const status = response.statusCode ?? 0;
          if (status >= 300 && status < 400 && response.headers.location) {
            response.resume();
            resolve({ redirect: new URL(response.headers.location, url).href });
            return;
          }
          const encoding = String(response.headers['content-encoding'] ?? '').toLowerCase();
          const decoder = DECODERS[encoding]?.();
          const source = decoder ? response.pipe(decoder) : response;
          const chunks = [];
          let size = 0;
          const fail = (error) => {
            request.destroy();
            reject(error);
          };
          source.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) fail(new HttpError(413, 'That file is too large to read.'));
            else chunks.push(chunk);
          });
          source.on('error', () => fail(new HttpError(502, 'That address sent something unreadable.')));
          source.on('end', () => resolve({ status, url: url.href, type: String(response.headers['content-type'] ?? ''), body: Buffer.concat(chunks) }));
        }
      );
      request.on('timeout', () => request.destroy(new HttpError(504, 'That address took too long to answer.')));
      request.on('error', (error) => {
        if (error instanceof HttpError) reject(error);
        else if (error?.code === 'EBLOCKED') reject(new HttpError(400, 'That address is not public.'));
        else reject(new HttpError(502, 'That address could not be reached.'));
      });
      request.end();
    });

  return (async () => {
    let url = check(input);
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const result = await once(url);
      if (!result.redirect) return result;
      url = check(result.redirect); // a redirect gets the same checks as the first address
    }
    throw new HttpError(502, 'That address redirects too many times.');
  })();
};
