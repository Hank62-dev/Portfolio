import http from 'node:http';
import { WebSocketServer } from 'ws';
import { configuredWorkers, createAgents } from './agents.mjs';
import { createAuth } from './auth.mjs';
import { HttpError, createResponder, readJson } from './http.mjs';
import { createHub } from './hub.mjs';
import { createTaskService } from './tasks.mjs';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Behind Render's proxy the socket address is the proxy, so prefer the forwarded client address.
const clientKey = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

export const createApp = (config) => {
  const agents = createAgents();
  const hub = createHub({ agents, maxEvents: config.maxEvents, maxTasks: config.maxTasks });
  const auth = createAuth(config);
  const tasks = createTaskService({ agents, hub, config });
  const { json, preflight } = createResponder(config.origin);

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

    'GET /api/auth/session': (req, res) => json(res, 200, { authenticated: auth.isAuthorized(req) }),

    'POST /api/auth/login': async (req, res) => {
      const input = await readJson(req, config.maxBodyBytes);
      const result = auth.login(clientKey(req), input.password);
      if (result.retryAfterSeconds) {
        return json(res, 429, { error: 'Too many attempts' }, { 'Retry-After': String(result.retryAfterSeconds) });
      }
      if (!result.ok) return json(res, 401, { error: 'Invalid password' });
      return json(res, 200, { authenticated: true }, { 'Set-Cookie': auth.sessionCookie(result.token) });
    },

    'POST /api/auth/logout': (req, res) => {
      auth.logout(req);
      json(res, 200, { authenticated: false }, { 'Set-Cookie': auth.clearCookie() });
    },

    'GET /api/state': (req, res) => {
      requireAuth(req);
      json(res, 200, hub.snapshot());
    },

    'POST /api/tasks': async (req, res) => {
      requireAuth(req);
      json(res, 201, tasks.create(await readJson(req, config.maxBodyBytes)));
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

  const wss = new WebSocketServer({
    server,
    maxPayload: config.maxBodyBytes,
    verifyClient: ({ origin, req }, done) => {
      if (origin !== config.origin) return done(false, 403, 'Origin not allowed');
      if (!auth.isAuthorized(req)) return done(false, 401, 'Authentication required');
      return done(true);
    },
  });

  wss.on('connection', (socket) => {
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
        for (const client of wss.clients) client.terminate();
        wss.close(() => server.close(() => resolve()));
      }),
  };
};
