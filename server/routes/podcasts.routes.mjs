// Podcasts: the directory search, and a podcast's episodes read from its own feed (see services/podcasts.mjs).
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const podcastsRoutes = ({ json, requireAuth, query, podcasts }) => ({
  // Podcasts: the directory search, and a podcast's episodes read from its own feed (see podcasts.mjs)
  'GET /api/podcasts/search': async (req, res) => {
    requireAuth(req);
    json(res, 200, await podcasts.search(query(req).get('q')));
  },

  'GET /api/podcasts/feed': async (req, res) => {
    requireAuth(req);
    json(res, 200, await podcasts.feed(query(req).get('url')));
  },
});
