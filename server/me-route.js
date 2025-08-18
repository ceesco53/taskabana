// server/me-route.js
// Small helper to add /api/me to your Express app.

/**
 * Wire this after session/auth middleware so req.session.user is set.
 * Works whether your server file uses ESM or CommonJS.
 */
export function registerMeRoute(app) {
  app.get("/api/me", (req, res) => {
    // Normalize to null when not logged in / not available
    const email =
      (req && req.session && req.session.user && req.session.user.email) ||
      req?.session?.user?.email ||
      null;
    res.json({ email });
  });
}

export default registerMeRoute;
