import http from 'node:http';
import zlib from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isPublicAddress, publicOnlyLookup, safeGet } from './safeFetch.mjs';

describe('which addresses are public', () => {
  it('refuses this machine, private networks, link-local and the cloud metadata address', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fd12:3456::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'not an address']) {
      expect(isPublicAddress(address), address).toBe(false);
    }
  });

  it('accepts ordinary public addresses', () => {
    for (const address of ['8.8.8.8', '17.253.144.10', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
      expect(isPublicAddress(address), address).toBe(true);
    }
  });

  it('checks the address a name really points to, at the moment of connecting', async () => {
    const fake = (address) => (host, options, callback) => callback(null, [{ address, family: 4 }]);
    await expect(new Promise((resolve, reject) => publicOnlyLookup(fake('10.0.0.5'))('feed.example', {}, (error, ...rest) => (error ? reject(error) : resolve(rest))))).rejects.toMatchObject({ code: 'EBLOCKED' });
    await expect(new Promise((resolve, reject) => publicOnlyLookup(fake('8.8.8.8'))('feed.example', {}, (error, ...rest) => (error ? reject(error) : resolve(rest))))).resolves.toEqual(['8.8.8.8', 4]);
    // a name with one private and one public address is only ever given the public one
    const mixed = (host, options, callback) => callback(null, [{ address: '127.0.0.1', family: 4 }, { address: '8.8.4.4', family: 4 }]);
    await expect(new Promise((resolve, reject) => publicOnlyLookup(mixed)('feed.example', { all: true }, (error, list) => (error ? reject(error) : resolve(list))))).resolves.toEqual([{ address: '8.8.4.4', family: 4 }]);
  });
});

describe('fetching an address somebody else chose', () => {
  let server;
  let base;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/ok') {
        res.setHeader('content-type', 'application/xml');
        res.end('<rss>hello</rss>');
      } else if (req.url === '/zipped') {
        res.setHeader('content-encoding', 'gzip');
        res.end(zlib.gzipSync('squeezed text'));
      } else if (req.url === '/bomb') {
        res.setHeader('content-encoding', 'gzip');
        res.end(zlib.gzipSync(Buffer.alloc(5 * 1024 * 1024)));
      } else if (req.url === '/big') {
        res.end(Buffer.alloc(2 * 1024 * 1024));
      } else if (req.url === '/hop') {
        res.statusCode = 302;
        res.setHeader('location', '/ok');
        res.end();
      } else if (req.url === '/loop') {
        res.statusCode = 302;
        res.setHeader('location', '/loop');
        res.end();
      } else if (req.url === '/slow') {
        setTimeout(() => res.end('late'), 3000).unref();
      } else {
        res.statusCode = 404;
        res.end('nothing');
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => server.close());

  it('will not touch this machine or its neighbours', async () => {
    await expect(safeGet(`${base}/ok`)).rejects.toMatchObject({ status: 400 });
    await expect(safeGet('http://169.254.169.254/latest/meta-data/')).rejects.toMatchObject({ status: 400 });
    await expect(safeGet('http://[::1]/')).rejects.toMatchObject({ status: 400 });
    await expect(safeGet('http://localhost:8787/')).rejects.toMatchObject({ status: 400 }); // the port, before even asking DNS
    await expect(safeGet('file:///etc/passwd')).rejects.toMatchObject({ status: 400 });
    await expect(safeGet('http://user:pass@example.com/')).rejects.toMatchObject({ status: 400 });
    await expect(safeGet('nonsense')).rejects.toMatchObject({ status: 400 });
  });

  it('blocks a name that points at this machine', async () => {
    await expect(safeGet('http://localhost/ok')).rejects.toMatchObject({ status: 400 });
  });

  it('reads a page, follows a redirect, and unpacks a compressed body', async () => {
    const options = { allowPrivate: true };
    expect((await safeGet(`${base}/ok`, options)).body.toString()).toBe('<rss>hello</rss>');
    expect((await safeGet(`${base}/hop`, options)).body.toString()).toBe('<rss>hello</rss>');
    expect((await safeGet(`${base}/zipped`, options)).body.toString()).toBe('squeezed text');
    expect((await safeGet(`${base}/ok`, options)).type).toContain('xml');
  });

  it('gives up on a redirect loop, a body that is too big (compressed or not), and a slow answer', async () => {
    const options = { allowPrivate: true };
    await expect(safeGet(`${base}/loop`, options)).rejects.toMatchObject({ status: 502 });
    await expect(safeGet(`${base}/big`, { ...options, maxBytes: 1024 * 1024 })).rejects.toMatchObject({ status: 413 });
    await expect(safeGet(`${base}/bomb`, { ...options, maxBytes: 1024 * 1024 })).rejects.toMatchObject({ status: 413 });
    await expect(safeGet(`${base}/slow`, { ...options, timeoutMs: 1000 })).rejects.toMatchObject({ status: 504 });
  });

  it('passes a 404 on so the caller can say what happened', async () => {
    expect((await safeGet(`${base}/missing`, { allowPrivate: true })).status).toBe(404);
  });
});
