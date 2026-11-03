import http from 'node:http';
import { WebSocketServer } from 'ws';
import { configuredWorkers, createAgents } from './agents.mjs';
import { createAi } from './ai.mjs';
import { createAuth } from './auth.mjs';
import { createBattle } from './battle.mjs';
import { createCalendar } from './calendar.mjs';
import { createDiscord } from './discord.mjs';
import { HttpError, createResponder, readBytes, readJson } from './http.mjs';
import { createHub } from './hub.mjs';
import { createSync } from './sync.mjs';
import { createTaskService } from './tasks.mjs';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Behind Render's proxy the socket address is the proxy, so prefer the forwarded client address.
const clientKey = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

export const createApp = (config, { fetchImpl = fetch, db = null } = {}) => {
  const agents = createAgents();
  const hub = createHub({ agents, maxEvents: config.maxEvents, maxTasks: config.maxTasks });
  const auth = createAuth(config);
  const tasks = createTaskService({ agents, hub, config });
  const ai = createAi({ ai: config.ai, fetchImpl });
  const battle = createBattle();
  const calendar = createCalendar({ url: config.calendarIcsUrl, fetchImpl });
  const discord = createDiscord({ webhooks: config.discordWebhooks, fetchImpl });
  const { json, bytes, preflight } = createResponder(config.origin);
  // personal data kept in a real database so every device sees the same thing; off when there is no database
  const sync = db ? createSync({ db, ...config.sync }) : null;
  const needSync = () => {
    if (!sync) throw new HttpError(503, 'Sync is not set up: add DATABASE_URL (a Postgres address) to the realtime service.');
    return sync;
  };
  const query = (req) => new URL(req.url, 'http://localhost').searchParams;

  const requireAuth = (req) => {
    if (!auth.isAuthorized(req)) throw new HttpError(401, 'Authentication required');
  };

  // The session cookie is SameSite=None in production, so any site could make the browser attach it.
  // Refuse state-changing requests that do not come from the one configured frontend.
  const requireTrustedOrigin = (req) => {
    if (!SAFE_METHODS.has(req.method) && req.headers.origin !== config.origin) {
      throw new HttpError(403, 'Origin not allowed');
    }
  };

  const routes = {
    'GET /health': (req, res) =>
      json(res, 200, {
        ok: true,
        mode: 'production',
        uptime: process.uptime(),
        agents: agents.length,
        configuredWorkers: configuredWorkers(config.env, agents),
      }),

    // Asking who is signed in also renews a lapsed access token from the refresh token, so a page that wakes up after a while
    // (or after the server slept) gets a fresh session in the same call.
    'GET /api/auth/session': (req, res) => {
      if (auth.isAuthorized(req)) return json(res, 200, { authenticated: true });
      const renewed = auth.refresh(req);
      if (renewed.ok) return json(res, 200, { authenticated: true }, { 'Set-Cookie': renewed.cookies });
      return json(res, 200, { authenticated: false });
    },

    'POST /api/auth/refresh': (req, res) => {
      const renewed = auth.refresh(req);
      if (!renewed.ok) return json(res, 401, { authenticated: false }, { 'Set-Cookie': auth.clearCookies() });
      return json(res, 200, { authenticated: true }, { 'Set-Cookie': renewed.cookies });
    },

    'POST /api/auth/login': async (req, res) => {
      const input = await readJson(req, config.maxBodyBytes);
      const result = auth.login(clientKey(req), input.password);
      if (result.retryAfterSeconds) {
        return json(res, 429, { error: 'Too many attempts' }, { 'Retry-After': String(result.retryAfterSeconds) });
      }
      if (!result.ok) return json(res, 401, { error: 'Invalid password' });
      return json(res, 200, { authenticated: true }, { 'Set-Cookie': result.cookies });
    },

    'POST /api/auth/logout': (req, res) => {
      json(res, 200, { authenticated: false }, { 'Set-Cookie': auth.clearCookies() });
    },

    'GET /api/state': (req, res) => {
      requireAuth(req);
      json(res, 200, hub.snapshot());
    },

    'POST /api/tasks': async (req, res) => {
      requireAuth(req);
      json(res, 201, tasks.create(await readJson(req, config.maxBodyBytes)));
    },

    // Owner-only helpers. Each is behind the session and the origin check, and the AI ones share a daily budget.
    'GET /api/ai/usage': (req, res) => {
      requireAuth(req);
      json(res, 200, { ...ai.usage(), calendar: calendar.configured });
    },

    'POST /api/ai/dj': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.dj(await readJson(req, config.maxAiBodyBytes)));
    },

    'POST /api/ai/note': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.note(await readJson(req, config.maxBodyBytes)));
    },

    'POST /api/ai/ask': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.ask(await readJson(req, config.maxAiBodyBytes)));
    },

    'POST /api/ai/cards': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.cards(await readJson(req, config.maxAiBodyBytes)));
    },

    'POST /api/ai/command': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.command(await readJson(req, config.maxBodyBytes)));
    },

    // ---- sync of the owner's personal data (see sync.mjs)
    'GET /api/sync/status': async (req, res) => {
      requireAuth(req);
      if (!sync) return json(res, 200, { enabled: false });
      return json(res, 200, { enabled: true, ...(await sync.usage()), maxBlobBytes: config.sync.maxBlobBytes });
    },

    'GET /api/sync/pull': async (req, res) => {
      requireAuth(req);
      const params = query(req);
      json(res, 200, await needSync().pull(params.get('since'), params.get('limit')));
    },

    'POST /api/sync/push': async (req, res) => {
      requireAuth(req);
      const body = await readJson(req, 2 * 1024 * 1024);
      const result = await needSync().push(body.changes);
      if (result.applied) hub.broadcast({ type: 'sync' }); // the other devices pull at once
      json(res, 200, result);
    },

    'PUT /api/sync/blob': async (req, res) => {
      requireAuth(req);
      const params = query(req);
      const data = await readBytes(req, config.sync.maxBlobBytes);
      json(res, 200, await needSync().putBlob({ store: params.get('store'), id: params.get('id'), mime: req.headers['content-type'], data, updatedAt: params.get('at') }));
    },

    'GET /api/sync/blob': async (req, res) => {
      requireAuth(req);
      const params = query(req);
      const file = await needSync().getBlob({ store: params.get('store'), id: params.get('id') });
      bytes(res, 200, file.data, file.mime);
    },

    'POST /api/ai/content': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.content(await readJson(req, config.maxBodyBytes)));
    },

    'POST /api/ai/pitch': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.pitch(await readJson(req, config.maxBodyBytes)));
    },

    // Posting to the owner's own Discord server through a webhook kept on the server (see discord.mjs).
    'GET /api/discord/channels': (req, res) => {
      requireAuth(req);
      json(res, 200, discord.channels());
    },

    'POST /api/discord/post': async (req, res) => {
      requireAuth(req);
      json(res, 200, await discord.post(await readJson(req, config.maxBodyBytes)));
    },

    'POST /api/ai/image': async (req, res) => {
      requireAuth(req);
      json(res, 200, await ai.image(await readJson(req, config.maxBodyBytes)));
    },

    'GET /api/briefing/calendar': async (req, res) => {
      requireAuth(req);
      const { searchParams } = new URL(req.url, 'http://localhost');
      json(res, 200, await calendar.between(new Date(searchParams.get('from') ?? ''), new Date(searchParams.get('to') ?? '')));
    },
  };

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return preflight(res);
      const { pathname } = new URL(req.url, 'http://localhost');
      const handler = routes[`${req.method} ${pathname}`];
      if (!handler) return json(res, 404, { error: 'Not found' });
      requireTrustedOrigin(req);
      return await handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) return json(res, error.status, { error: error.message });
      console.error('Unhandled request error:', error);
      return json(res, 500, { error: 'Internal server error' });
    }
  });

  // Two sockets share the one server. The owner's realtime link needs the session; the online sea battle at /battle is open to
  // anyone with a room code, so it gets no session but the same origin check, and its messages are kept small.
  const wss = new WebSocketServer({ noServer: true, maxPayload: config.maxBodyBytes });
  const battleWss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 });

  const refuse = (socket, status, text) => {
    socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    socket.destroy();
  };

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (req.headers.origin !== config.origin) return refuse(socket, 403, 'Forbidden');
    if (pathname === '/battle') {
      return battleWss.handleUpgrade(req, socket, head, (client) => {
        client.isAlive = true;
        // an oversized or malformed frame makes the socket emit 'error'; without a listener that would stop the whole server
        client.on('error', () => client.terminate());
        client.on('pong', () => {
          client.isAlive = true;
        });
        battle.attach(client);
      });
    }
    if (!auth.isAuthorized(req)) return refuse(socket, 401, 'Unauthorized');
    return wss.handleUpgrade(req, socket, head, (client) => wss.emit('connection', client, req));
  });

  // A phone that lost its signal never says goodbye. Ping the battle sockets, drop the silent ones, and tidy empty rooms.
  const heartbeat = setInterval(() => {
    for (const client of battleWss.clients) {
      if (!client.isAlive) client.terminate();
      else {
        client.isAlive = false;
        client.ping();
      }
    }
    battle.sweep();
  }, 25000);
  heartbeat.unref();

  wss.on('connection', (socket) => {
    socket.on('error', () => socket.terminate());
    hub.clients.add(socket);
    socket.send(JSON.stringify({ type: 'state', ...hub.snapshot() }));
    socket.on('close', () => hub.clients.delete(socket));
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw);
        if (message.type !== 'task') return;
        try {
          tasks.create(message);
        } catch (error) {
          socket.send(JSON.stringify({ type: 'task_error', error: error.message }));
        }
      } catch {
        socket.send(JSON.stringify({ type: 'task_error', error: 'Invalid message' }));
      }
    });
  });

  return {
    server,
    listen: (port = config.port) => new Promise((resolve) => server.listen(port, () => resolve(server.address().port))),
    close: () =>
      new Promise((resolve) => {
        clearInterval(heartbeat);
        for (const client of [...wss.clients, ...battleWss.clients]) client.terminate();
        wss.close(() => battleWss.close(() => server.close(() => resolve())));
      }),
  };
};
