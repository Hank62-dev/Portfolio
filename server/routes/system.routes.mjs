// The health check (open to anyone, for an uptime monitor), the state of the agents and a new task for one.
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const systemRoutes = ({ config, json, readJson, requireAuth, hub, tasks, push }) => ({
  'GET /health': (req, res) => {
    push.nudge(); // an uptime ping that wakes a sleeping server also gets the reminders looked at
    // nothing about the server's set-up: this answer is for anyone, an uptime monitor included
    return json(res, 200, { ok: true });
  },

  'GET /api/state': (req, res) => {
    requireAuth(req);
    json(res, 200, hub.snapshot());
  },

  'POST /api/tasks': async (req, res) => {
    requireAuth(req);
    json(res, 201, tasks.create(await readJson(req, config.maxBodyBytes)));
  },
});
