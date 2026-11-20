"use strict";

const path = require("path");
const express = require("express");

const defaultSettings = require("./settings");
const { parseDate, slotsForDate } = require("./schedule");
const { validateAppointment } = require("./validation");
const { createMemoryStore, SlotTakenError } = require("./store");
const { securityHeaders, createRateLimiter, isSameOrigin } = require("./security");

const PUBLIC_DIR = path.join(__dirname, "public");
// Liste fermée des fichiers servis : impossible de demander autre chose.
const ASSETS = { "app.js": "app.js", "style.css": "style.css" };

function createBookingRouter({
  store = createMemoryStore(),
  settings = defaultSettings,
  now = () => new Date(),
  rateLimit
} = {}) {
  const router = express.Router();

  router.use(["/rendez-vous", "/api/rendez-vous"], securityHeaders);

  router.get("/rendez-vous", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });

  router.get("/rendez-vous/:file", (req, res) => {
    const file = Object.hasOwn(ASSETS, req.params.file) && ASSETS[req.params.file];
    if (!file) return res.sendStatus(404);
    res.sendFile(path.join(PUBLIC_DIR, file));
  });

  router.get("/api/rendez-vous/services", (req, res) => {
    res.json({ services: settings.services });
  });

  router.get("/api/rendez-vous/creneaux", (req, res) => {
    const { date } = req.query;
    if (!parseDate(date)) return res.status(400).json({ error: "Date invalide." });

    const taken = new Set(store.takenTimes(date));
    const slots = slotsForDate(date, settings, now()).filter((t) => !taken.has(t));
    res.json({ date, slots });
  });

  router.post(
    "/api/rendez-vous",
    createRateLimiter(rateLimit),
    (req, res, next) => {
      if (!isSameOrigin(req)) return res.status(403).json({ error: "Origine refusée." });
      if (!req.is("application/json")) return res.status(415).json({ error: "JSON attendu." });
      next();
    },
    express.json({ limit: "10kb", strict: true }),
    (req, res) => {
      const result = validateAppointment(req.body, settings, now());
      if (!result.ok) {
        // Un robot reçoit la même réponse générique qu'une erreur : on ne l'aide pas.
        return res.status(400).json({ error: "Demande invalide.", errors: result.bot ? {} : result.errors });
      }

      try {
        const created = store.create(result.value);
        res.status(201).json({ id: created.id, service: created.service, date: created.date, time: created.time });
      } catch (err) {
        if (err instanceof SlotTakenError) {
          return res.status(409).json({ error: "Ce créneau vient d'être réservé. Choisissez-en un autre." });
        }
        // Aucune donnée personnelle dans le journal, et aucun détail interne au client.
        console.error("[rendez-vous] échec d'enregistrement :", err.name);
        res.status(500).json({ error: "Erreur interne. Réessayez plus tard." });
      }
    }
  );

  // Erreurs de lecture du corps (JSON mal formé, trop gros…).
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Demande trop volumineuse." });
    res.status(400).json({ error: "Demande illisible." });
  });

  return router;
}

module.exports = { createBookingRouter };
