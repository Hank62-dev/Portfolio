// Sync of the owner's personal data across devices (see services/sync.mjs).
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const syncRoutes = ({ config, json, bytes, readJson, readBytes, requireAuth, query, hub, sync, needSync }) => ({
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
});
