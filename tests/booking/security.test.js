"use strict";

const { createRateLimiter, isSameOrigin } = require("../../services/booking/security");

describe("createRateLimiter", () => {
  function run(limiter, ip) {
    const res = { headers: {}, statusCode: 200, body: null };
    res.set = (k, v) => { res.headers[k] = v; return res; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (b) => { res.body = b; return res; };
    let passed = false;
    limiter({ ip }, res, () => { passed = true; });
    return { passed, res };
  }

  test("laisse passer jusqu'à la limite, puis bloque", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect(run(limiter, "1.1.1.1").passed).toBe(true);
    expect(run(limiter, "1.1.1.1").passed).toBe(true);
    const blocked = run(limiter, "1.1.1.1");
    expect(blocked.passed).toBe(false);
    expect(blocked.res.statusCode).toBe(429);
    expect(blocked.res.headers["Retry-After"]).toBe("1");
  });

  test("chaque IP a son propre compteur", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    expect(run(limiter, "1.1.1.1").passed).toBe(true);
    expect(run(limiter, "2.2.2.2").passed).toBe(true);
  });

  test("le compteur repart à zéro après la fenêtre", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => t });
    run(limiter, "1.1.1.1");
    expect(run(limiter, "1.1.1.1").passed).toBe(false);
    t = 1001;
    expect(run(limiter, "1.1.1.1").passed).toBe(true);
  });

  test("valeurs par défaut utilisables", () => {
    const limiter = createRateLimiter();
    expect(run(limiter, undefined).passed).toBe(true);
  });
});

describe("isSameOrigin", () => {
  const req = (origin, host) => ({ get: (h) => ({ origin, host }[h.toLowerCase()]) });

  test("pas d'en-tête Origin → accepté (navigateur ancien / outil)", () => {
    expect(isSameOrigin(req(undefined, "a.example"))).toBe(true);
  });
  test("même hôte → accepté", () => {
    expect(isSameOrigin(req("https://a.example", "a.example"))).toBe(true);
  });
  test("autre hôte → refusé", () => {
    expect(isSameOrigin(req("https://b.example", "a.example"))).toBe(false);
  });
  test("Origin illisible → refusé", () => {
    expect(isSameOrigin(req("null", "a.example"))).toBe(false);
  });
});

describe("createRateLimiter — mémoire", () => {
  test("oublie les IP expirées quand la table devient grande", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 10, now: () => t });
    const res = { set() { return res; }, status() { return res; }, json() { return res; } };
    for (let i = 0; i <= 10001; i++) limiter({ ip: `10.0.${i >> 8}.${i & 255}` }, res, () => {});
    t = 100;
    let passed = false;
    limiter({ ip: "10.0.0.0" }, res, () => { passed = true; });
    expect(passed).toBe(true);
  });
});
