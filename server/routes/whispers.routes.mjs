// The portfolio guestbook (see services/whispers.mjs): anyone may read and add, only the owner may put one out.
export const whispersRoutes = ({ config, json, readJson, requireAuth, who, whispers }) => ({
  'GET /api/whispers': async (req, res) => json(res, 200, { whispers: await whispers.list() }),

  'POST /api/whispers': async (req, res) => json(res, 201, { whisper: await whispers.add(who(req), await readJson(req, 2 * 1024)) }),

  'POST /api/whispers/remove': async (req, res) => {
    requireAuth(req);
    const body = await readJson(req, config.maxBodyBytes);
    await whispers.remove(body?.id);
    json(res, 200, { ok: true });
  },
});
