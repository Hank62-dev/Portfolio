import http from 'node:http';
import { WebSocketServer } from 'ws';
import { createAgents } from './services/agents.mjs';
import { createAi } from './services/ai.mjs';
import { createAuth } from './services/auth.mjs';
import { createBattle } from './services/battle.mjs';
import { createCalendar } from './services/calendar.mjs';
import { createGoogleCalendar } from './services/gcal.mjs';
import { createDiscord } from './services/discord.mjs';
import { HttpError, clientKey, createResponder, readBytes, readJson } from './http/http.mjs';
import { createHub } from './services/hub.mjs';
import { createLimiter } from './http/limits.mjs';
import { createPodcasts } from './services/podcasts.mjs';
import { createPush } from './services/push.mjs';
import { createSync } from './services/sync.mjs';
import { createTaskService } from './services/tasks.mjs';
import { systemRoutes } from './routes/system.routes.mjs';
import { authRoutes } from './routes/auth.routes.mjs';
import { pushRoutes } from './routes/push.routes.mjs';
import { aiRoutes } from './routes/ai.routes.mjs';
import { syncRoutes } from './routes/sync.routes.mjs';
import { creatorRoutes } from './routes/creator.routes.mjs';
import { ragRoutes } from './routes/rag.routes.mjs';
import { podcastsRoutes } from './routes/podcasts.routes.mjs';
import { calendarRoutes } from './routes/calendar.routes.mjs';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const createApp = (config, { fetchImpl = fetch, db = null, sendPush, podcastGet } = {}) => {
  const agents = createAgents();
  const hub = createHub({ agents, maxEvents: config.maxEvents, maxTasks: config.maxTasks });
  const auth = createAuth(config);
  const tasks = createTaskService({ agents, hub, config });
  const ai = createAi({ ai: config.ai, fetchImpl });
  const battle = createBattle();
  const ics = createCalendar({ url: config.calendarIcsUrl, fetchImpl });
  const google = createGoogleCalendar({ db, settings: config.google, fetchImpl, zone: config.push.zone });
  google.start();
  // what the briefing and the reminders read: the Google calendar when the owner has connected it, the secret ICS feed otherwise
  const calendar = {
    get configured() {
      return ics.configured || google.connected;
    },
    between: async (from, to) => ((await google.isConnected()) ? { configured: true, events: await google.between(from, to) } : ics.between(from, to)),
  };
  const podcasts = createPodcasts({ get: podcastGet });
  const discord = createDiscord({ webhooks: config.discordWebhooks, fetchImpl });
  const { json, bytes, redirect, preflight } = createResponder(config.origin);
  // personal data kept in a real database so every device sees the same thing; off when there is no database
  const sync = db ? createSync({ db, ...config.sync }) : null;
  const needSync = () => {
    if (!sync) throw new HttpError(503, 'Sync is not set up: add DATABASE_URL (a Postgres address) to the realtime service.');
    return sync;
  };
  // reminders that reach a device with the app closed (see push.mjs); off without a database and VAPID keys
  const push = createPush({ db, sync, calendar, vapid: config.push, zone: config.push.zone, send: sendPush });
  push.start();
  const query = (req) => new URL(req.url, 'http://localhost').searchParams;
  const who = (req) => clientKey(req, config.trustedProxyHops);

  // Who may ask how often. Sign-in has its own, stricter count in auth.mjs; these catch a runaway script or a flood.
  const limits = {
    general: createLimiter(config.rateLimit.general),
    heavy: createLimiter(config.rateLimit.heavy), // what costs something to answer: AI, podcast feeds, tickets for the RAG service
    auth: createLimiter(config.rateLimit.auth),
  };
  const tierOf = (pathname) => (pathname.startsWith('/api/auth/') ? 'auth' : /^\/api\/(ai|podcasts|rag)\//.test(pathname) ? 'heavy' : 'general');

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

  // every route, by group (see routes/): what each group reaches is in this one object
  const ctx = { config, json, bytes, redirect, readJson, readBytes, requireAuth, query, who, auth, hub, tasks, push, ai, calendar, sync, needSync, discord, podcasts, google };
  const routes = {
    ...systemRoutes(ctx),
    ...authRoutes(ctx),
    ...pushRoutes(ctx),
    ...aiRoutes(ctx),
    ...syncRoutes(ctx),
    ...creatorRoutes(ctx),
    ...ragRoutes(ctx),
    ...podcastsRoutes(ctx),
    ...calendarRoutes(ctx),
  };

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return preflight(res);
      const { pathname } = new URL(req.url, 'http://localhost');
      const handler = routes[`${req.method} ${pathname}`];
      if (!handler) return json(res, 404, { error: 'Not found' });
      const allowed = limits[tierOf(pathname)].hit(who(req));
      if (!allowed.ok) return json(res, 429, { error: 'Too many requests. Slow down a little.' }, { 'Retry-After': String(allowed.retryAfterSeconds) });
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
        push.stop();
        for (const client of [...wss.clients, ...battleWss.clients]) client.terminate();
        wss.close(() => battleWss.close(() => server.close(() => resolve())));
      }),
  };
};
