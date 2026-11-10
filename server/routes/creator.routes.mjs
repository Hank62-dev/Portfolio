// The Creator Lab: posting to the owner's own Discord server through a webhook kept on the server (see services/discord.mjs).
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const creatorRoutes = ({ config, json, readJson, requireAuth, discord }) => ({
  // Posting to the owner's own Discord server through a webhook kept on the server (see services/discord.mjs).
  'GET /api/discord/channels': (req, res) => {
    requireAuth(req);
    json(res, 200, discord.channels());
  },

  'POST /api/discord/post': async (req, res) => {
    requireAuth(req);
    json(res, 200, await discord.post(await readJson(req, config.maxBodyBytes)));
  },
});
