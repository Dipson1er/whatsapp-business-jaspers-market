"use strict";

/** En-têtes HTTP qui demandent au navigateur de se protéger. */
function securityHeaders(req, res, next) {
  res.set({
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; " +
      "connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store"
  });
  next();
}

/**
 * Limite simple « N requêtes par fenêtre de temps et par IP ».
 * Derrière un proxy (Heroku, Nginx…), activez `app.set("trust proxy", 1)`
 * pour que req.ip soit la vraie IP du client.
 */
function createRateLimiter({ max = 10, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    const t = now();
    if (hits.size > 10000) {
      for (const [key, entry] of hits) if (entry.resetAt <= t) hits.delete(key);
    }

    const key = req.ip || "inconnu";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return res.status(429).json({ error: "Trop de demandes. Réessayez plus tard." });
    }
    next();
  };
}

/** Vrai si la requête vient de notre propre site (protection CSRF). */
function isSameOrigin(req) {
  const origin = req.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get("host");
  } catch {
    return false;
  }
}

module.exports = { securityHeaders, createRateLimiter, isSameOrigin };
