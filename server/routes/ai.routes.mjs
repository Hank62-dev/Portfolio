// The owner's AI helpers (see services/ai.mjs). Each is behind the session and the origin check, and they share a daily budget.
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const aiRoutes = ({ config, json, readJson, readBytes, requireAuth, query, ai, calendar }) => ({
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

  'POST /api/ai/organize': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.organize(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/ai/receipt': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.receipt(await readJson(req, 2 * 1024 * 1024)));
  },

  'POST /api/ai/review': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.review(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/ai/command': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.command(await readJson(req, config.maxBodyBytes)));
  },

  // a recording (WAV) in the body, the language in the query: the words come back as text
  'POST /api/ai/transcribe': async (req, res) => {
    requireAuth(req);
    const data = await readBytes(req, config.maxAudioBytes);
    json(res, 200, await ai.transcribe({ data, language: query(req).get('lang') }));
  },

  'POST /api/ai/content': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.content(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/ai/pitch': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.pitch(await readJson(req, config.maxBodyBytes)));
  },

  'POST /api/ai/image': async (req, res) => {
    requireAuth(req);
    json(res, 200, await ai.image(await readJson(req, config.maxBodyBytes)));
  },
});
