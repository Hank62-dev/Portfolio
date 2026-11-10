// Signing in and out, and renewing the session (see services/auth.mjs). These are the routes a visitor reaches without one.
// Each handler is `(req, res)`; `ctx` is what app.mjs gives every group (see createApp).
export const authRoutes = ({ config, json, readJson, who, auth }) => ({
  // Asking who is signed in also renews a lapsed access token from the refresh token, so a page that wakes up after a while
  // (or after the server slept) gets a fresh session in the same call.
  'GET /api/auth/session': (req, res) => {
    if (auth.isAuthorized(req)) return json(res, 200, { authenticated: true });
    const renewed = auth.refresh(req);
    if (renewed.ok) return json(res, 200, { authenticated: true }, { 'Set-Cookie': renewed.cookies });
    return json(res, 200, { authenticated: false });
  },

  'POST /api/auth/refresh': (req, res) => {
    const renewed = auth.refresh(req);
    if (!renewed.ok) return json(res, 401, { authenticated: false }, { 'Set-Cookie': auth.clearCookies() });
    return json(res, 200, { authenticated: true }, { 'Set-Cookie': renewed.cookies });
  },

  'POST /api/auth/login': async (req, res) => {
    const input = await readJson(req, config.maxBodyBytes);
    const result = auth.login(who(req), input.password);
    // still locked out: the password was not tried. A wrong one that starts a lockout says so, with how long it lasts.
    if (result.locked) return json(res, 429, { error: 'Too many attempts', retryAfterSeconds: result.retryAfterSeconds }, { 'Retry-After': String(result.retryAfterSeconds) });
    if (!result.ok) {
      const lockedFor = result.retryAfterSeconds ? { 'Retry-After': String(result.retryAfterSeconds) } : {};
      return json(res, 401, { error: 'Invalid password', retryAfterSeconds: result.retryAfterSeconds ?? 0, attemptsLeft: result.attemptsLeft ?? 0 }, lockedFor);
    }
    return json(res, 200, { authenticated: true }, { 'Set-Cookie': result.cookies });
  },

  'POST /api/auth/logout': (req, res) => {
    json(res, 200, { authenticated: false }, { 'Set-Cookie': auth.clearCookies() });
  },
});
