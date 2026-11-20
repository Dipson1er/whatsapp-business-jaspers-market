"use strict";

const express = require("express");
const request = require("supertest");
const { createBookingRouter } = require("../../services/booking/router");
const { createMemoryStore } = require("../../services/booking/store");

const settings = {
  openDays: [1, 2, 3, 4, 5, 6],
  openTime: "09:00",
  closeTime: "12:00",
  slotMinutes: 60,
  maxDaysAhead: 30,
  services: [{ id: "retrait", label: "Retrait de commande" }]
};
const now = () => new Date(2026, 10, 20, 8, 0);

function buildApp(options = {}) {
  const store = options.store || createMemoryStore();
  const app = express();
  app.use(createBookingRouter({ store, settings, now, rateLimit: options.rateLimit }));
  return { app, store };
}

const body = (overrides = {}) => ({
  service: "retrait",
  date: "2026-11-23",
  time: "10:00",
  name: "Marie Dupont",
  phone: "+33612345678",
  ...overrides
});

describe("GET /rendez-vous", () => {
  test("renvoie la page HTML", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/rendez-vous");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("<form");
  });

  test("sert le script et le style de la page", async () => {
    const { app } = buildApp();
    const js = await request(app).get("/rendez-vous/app.js");
    expect(js.status).toBe(200);
    expect(js.headers["content-type"]).toMatch(/javascript/);
    const css = await request(app).get("/rendez-vous/style.css");
    expect(css.status).toBe(200);
    expect(css.headers["content-type"]).toMatch(/css/);
  });

  test("ne permet pas de sortir du dossier public", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/rendez-vous/..%2f..%2fconfig.js");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/rendez-vous/services", () => {
  test("liste les services", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/rendez-vous/services");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ services: settings.services });
  });
});

describe("GET /api/rendez-vous/creneaux", () => {
  test("renvoie les créneaux libres", async () => {
    const { app, store } = buildApp();
    store.create({ ...body(), email: "", notes: "" });
    const res = await request(app).get("/api/rendez-vous/creneaux?date=2026-11-23");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ date: "2026-11-23", slots: ["09:00", "11:00"] });
  });

  test("ne renvoie aucune donnée personnelle", async () => {
    const { app, store } = buildApp();
    store.create({ ...body(), email: "", notes: "" });
    const res = await request(app).get("/api/rendez-vous/creneaux?date=2026-11-23");
    expect(JSON.stringify(res.body)).not.toContain("Marie");
    expect(JSON.stringify(res.body)).not.toContain("336");
  });

  test.each(["", "?date=hier", "?date[]=2026-11-23"])("400 si la date est invalide (%s)", async (qs) => {
    const { app } = buildApp();
    const res = await request(app).get(`/api/rendez-vous/creneaux${qs}`);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/rendez-vous", () => {
  test("crée le rendez-vous (201)", async () => {
    const { app, store } = buildApp();
    const res = await request(app).post("/api/rendez-vous").send(body());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^[A-Z0-9]{8}$/),
      service: "retrait",
      date: "2026-11-23",
      time: "10:00"
    });
    expect(store.get(res.body.id).name).toBe("Marie Dupont");
  });

  test("400 avec la liste des erreurs si la demande est invalide", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/api/rendez-vous").send(body({ phone: "abc" }));
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("phone");
  });

  test("409 si le créneau est déjà pris", async () => {
    const { app } = buildApp();
    await request(app).post("/api/rendez-vous").send(body());
    const res = await request(app).post("/api/rendez-vous").send(body({ name: "Paul Martin" }));
    expect(res.status).toBe(409);
  });

  test("robot détecté : réponse neutre, rien n'est enregistré", async () => {
    const { app, store } = buildApp();
    const res = await request(app).post("/api/rendez-vous").send(body({ website: "spam" }));
    expect(res.status).toBe(400);
    expect(store.takenTimes("2026-11-23")).toEqual([]);
  });

  test("500 générique si le stockage plante, sans détail interne", async () => {
    const store = createMemoryStore();
    store.create = () => { throw new Error("secret interne"); };
    const { app } = buildApp({ store });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).post("/api/rendez-vous").send(body());
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});

describe("Sécurité", () => {
  test("en-têtes de sécurité sur la page", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/rendez-vous");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["content-security-policy"]).not.toContain("unsafe-inline");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["cache-control"]).toContain("no-store");
  });

  test("refuse un formulaire envoyé par un autre site (CSRF)", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/rendez-vous")
      .set("Origin", "https://site-malveillant.example")
      .send(body());
    expect(res.status).toBe(403);
  });

  test("accepte la même origine", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/rendez-vous")
      .set("Host", "boutique.example")
      .set("Origin", "https://boutique.example")
      .send(body());
    expect(res.status).toBe(201);
  });

  test("refuse un corps qui n'est pas du JSON (415)", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/rendez-vous")
      .type("form")
      .send("name=Marie&phone=0612345678");
    expect(res.status).toBe(415);
  });

  test("refuse un JSON mal formé (400)", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/rendez-vous")
      .set("Content-Type", "application/json")
      .send("{pas du json");
    expect(res.status).toBe(400);
  });

  test("refuse un corps trop gros (413)", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/rendez-vous")
      .send(body({ notes: "x".repeat(20000) }));
    expect(res.status).toBe(413);
  });

  test("limite le nombre de réservations par IP (429)", async () => {
    const { app } = buildApp({ rateLimit: { max: 2, windowMs: 60000 } });
    await request(app).post("/api/rendez-vous").send(body({ time: "09:00" }));
    await request(app).post("/api/rendez-vous").send(body({ time: "10:00" }));
    const res = await request(app).post("/api/rendez-vous").send(body({ time: "11:00" }));
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  test("ignore la pollution de prototype", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/rendez-vous")
      .set("Content-Type", "application/json")
      .send('{"__proto__":{"admin":true},"service":"retrait","date":"2026-11-23","time":"10:00","name":"Marie Dupont","phone":"+33612345678"}');
    expect(res.status).toBe(201);
    expect({}.admin).toBeUndefined();
  });
});

describe("Réglages par défaut", () => {
  test("le routeur fonctionne sans aucune option", async () => {
    const app = express();
    app.use(createBookingRouter());
    const res = await request(app).get("/api/rendez-vous/services");
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBeGreaterThan(0);
  });

  test("ne touche pas aux autres adresses du serveur (ex. /webhook)", async () => {
    const app = express();
    app.use(createBookingRouter());
    app.post("/webhook", express.json(), (req, res) => res.json({ got: req.body }));
    const res = await request(app).post("/webhook").send({ a: 1 });
    expect(res.body).toEqual({ got: { a: 1 } });
    expect(res.headers["content-security-policy"]).toBeUndefined();
  });
});
