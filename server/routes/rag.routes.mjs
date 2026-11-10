import { RAG_TOKEN_TTL_MS, mintRagToken } from '../services/ragToken.mjs';

// A ticket the browser shows to the Hank RAG service, which answers nobody without one (see services/ragToken.mjs).
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const ragRoutes = ({ config, json, requireAuth }) => ({
  // A ticket the browser shows to the Hank RAG service, which answers nobody without one (see services/ragToken.mjs)
  'POST /api/rag/token': (req, res) => {
    requireAuth(req);
    if (!config.ragTokenSecret) return json(res, 200, { enabled: false, token: '', expiresIn: 0 });
    json(res, 200, { enabled: true, token: mintRagToken({ secret: config.ragTokenSecret }), expiresIn: Math.floor(RAG_TOKEN_TTL_MS / 1000) });
  },
});
