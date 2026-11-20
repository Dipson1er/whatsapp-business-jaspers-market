"use strict";

const { validateAppointment } = require("../../services/booking/validation");

const settings = {
  openDays: [1, 2, 3, 4, 5, 6],
  openTime: "09:00",
  closeTime: "12:00",
  slotMinutes: 60,
  maxDaysAhead: 30,
  services: [
    { id: "retrait", label: "Retrait de commande" },
    { id: "conseil", label: "Conseil" }
  ]
};
const now = new Date(2026, 10, 20, 8, 0);

function valid(overrides = {}) {
  return {
    service: "retrait",
    date: "2026-11-23",
    time: "10:00",
    name: "Marie Dupont",
    phone: "+33 6 12 34 56 78",
    email: "marie@example.com",
    notes: "Je viendrai avec un sac.",
    website: "",
    ...overrides
  };
}

const check = (input) => validateAppointment(input, settings, now);

describe("validateAppointment — cas valides", () => {
  test("accepte une demande complète et nettoie les valeurs", () => {
    const result = check(valid({ name: "  Marie   Dupont ", email: " Marie@Example.com " }));
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      service: "retrait",
      date: "2026-11-23",
      time: "10:00",
      name: "Marie Dupont",
      phone: "+33612345678",
      email: "marie@example.com",
      notes: "Je viendrai avec un sac."
    });
  });

  test("e-mail et remarque sont facultatifs", () => {
    const result = check(valid({ email: undefined, notes: "" }));
    expect(result.ok).toBe(true);
    expect(result.value.email).toBe("");
    expect(result.value.notes).toBe("");
  });

  test("accepte les noms avec accents, apostrophes et tirets", () => {
    expect(check(valid({ name: "Zoé O'Brien-Lefèvre" })).ok).toBe(true);
  });
});

describe("validateAppointment — refus", () => {
  test("refuse autre chose qu'un objet", () => {
    expect(check(null).ok).toBe(false);
    expect(check("texte").ok).toBe(false);
    expect(check([]).ok).toBe(false);
  });

  test.each([
    ["service", { service: "inconnu" }],
    ["service", { service: ["retrait"] }],
    ["date", { date: "2026-02-30" }],
    ["date", { date: "2026-11-22" }], // dimanche
    ["time", { time: "10:15" }],
    ["time", { time: "18:00" }],
    ["name", { name: "A" }],
    ["name", { name: "x".repeat(81) }],
    ["name", { name: "<script>alert(1)</script>" }],
    ["phone", { phone: "123" }],
    ["phone", { phone: "06 12 34 56 78; DROP TABLE" }],
    ["email", { email: "pas-un-email" }],
    ["email", { email: "a@b.c\r\nBcc: x@y.z" }],
    ["notes", { notes: "x".repeat(501) }],
    ["notes", { notes: { $gt: "" } }]
  ])("champ %s invalide : %p", (field, overrides) => {
    const result = check(valid(overrides));
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty(field);
  });

  test("refuse si un champ obligatoire manque", () => {
    const result = check({});
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(["date", "name", "phone", "service", "time"]);
  });

  test("détecte les robots qui remplissent le champ piège", () => {
    const result = check(valid({ website: "http://spam.example" }));
    expect(result.ok).toBe(false);
    expect(result.bot).toBe(true);
  });

  test("retire les caractères de contrôle de la remarque", () => {
    const result = check(valid({ notes: "ligne 1\u0000\u0007\nligne 2" }));
    expect(result.ok).toBe(true);
    expect(result.value.notes).toBe("ligne 1\nligne 2");
  });
});

describe("validateAppointment — cas limites", () => {
  test("refuse un e-mail qui n'est pas du texte", () => {
    const result = check(valid({ email: ["a@b.fr"] }));
    expect(result.errors).toHaveProperty("email");
  });

  test("utilise l'heure actuelle par défaut", () => {
    const result = validateAppointment(valid({ date: "2000-01-03" }), settings);
    expect(result.errors).toHaveProperty("date");
  });
});
