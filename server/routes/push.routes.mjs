// Web Push (see services/push.mjs): the app asks for the key, subscribes this device, and can send itself a test.
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const pushRoutes = ({ config, json, readJson, requireAuth, push }) => ({
  // ---- Web Push (see services/push.mjs): the app asks for the key, subscribes this device, and can send itself a test
  'GET /api/push/key': (req, res) => {
    requireAuth(req);
    json(res, 200, { enabled: push.enabled, publicKey: push.publicKey });
  },

  'POST /api/push/subscribe': async (req, res) => {
    requireAuth(req);
    json(res, 200, await push.subscribe(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/push/unsubscribe': async (req, res) => {
    requireAuth(req);
    const body = await readJson(req, config.maxBodyBytes);
    json(res, 200, await push.unsubscribe(body.endpoint));
  },

  'POST /api/push/test': async (req, res) => {
    requireAuth(req);
    json(res, 200, await push.sendTest());
  },
});
