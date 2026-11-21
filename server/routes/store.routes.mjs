// The storefront (see services/storefront.mjs). Visitors read what is on offer, order, follow short links and write from the media
// kit; SePay tells of incoming transfers; the owner sets it all up, sends invoices and marks orders.
export const STORE_WEBHOOKS = new Set(['/api/store/sepay']); // called by a payment service, not by a browser: no Origin to check

export const storeRoutes = ({ config, json, readJson, requireAuth, query, who, store }) => ({
  'GET /api/store/public': async (req, res) => json(res, 200, await store.publicConfig()),

  'GET /api/store/slots': async (req, res) => json(res, 200, { slots: await store.slots() }),

  'POST /api/store/order': async (req, res) => json(res, 201, { order: await store.order(who(req), await readJson(req, 4 * 1024)) }),

  'GET /api/store/order': async (req, res) => json(res, 200, { order: await store.view(query(req).get('id')) }),

  'GET /api/store/go': async (req, res) => json(res, 200, await store.follow(query(req).get('slug'))),

  'POST /api/store/lead': async (req, res) => json(res, 201, await store.lead(who(req), await readJson(req, 8 * 1024))),

  'POST /api/store/sepay': async (req, res) => json(res, 200, await store.sepay(req.headers.authorization, await readJson(req, 16 * 1024))),

  'GET /api/store/admin': async (req, res) => {
    requireAuth(req);
    json(res, 200, await store.admin());
  },

  'POST /api/store/config': async (req, res) => {
    requireAuth(req);
    json(res, 200, { config: await store.setConfig(await readJson(req, config.maxBodyBytes)) });
  },

  'POST /api/store/invoice': async (req, res) => {
    requireAuth(req);
    json(res, 201, { order: await store.invoice(await readJson(req, config.maxBodyBytes)) });
  },

  'POST /api/store/mark': async (req, res) => {
    requireAuth(req);
    json(res, 200, { order: await store.mark(await readJson(req, config.maxBodyBytes)) });
  },

  'POST /api/store/remove': async (req, res) => {
    requireAuth(req);
    json(res, 200, await store.remove(await readJson(req, config.maxBodyBytes)));
  },
});
