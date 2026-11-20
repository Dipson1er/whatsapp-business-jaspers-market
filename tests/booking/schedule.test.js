"use strict";

const { slotsForDate, parseDate, formatDate } = require("../../services/booking/schedule");

const settings = {
  openDays: [1, 2, 3, 4, 5, 6], // lundi → samedi
  openTime: "09:00",
  closeTime: "12:00",
  slotMinutes: 60,
  maxDaysAhead: 30
};

// Vendredi 20 novembre 2026, 08:00 (heure locale)
const now = new Date(2026, 10, 20, 8, 0);

describe("parseDate", () => {
  test("lit une date AAAA-MM-JJ valide", () => {
    const d = parseDate("2026-11-23");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(23);
  });

  test.each(["", "2026-13-01", "2026-02-30", "23/11/2026", "2026-1-1", null, 42])(
    "refuse %p",
    (value) => {
      expect(parseDate(value)).toBeNull();
    }
  );
});

describe("formatDate", () => {
  test("formate en AAAA-MM-JJ", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("slotsForDate", () => {
  test("liste les créneaux d'un jour ouvert", () => {
    expect(slotsForDate("2026-11-23", settings, now)).toEqual(["09:00", "10:00", "11:00"]);
  });

  test("aucun créneau le dimanche", () => {
    expect(slotsForDate("2026-11-22", settings, now)).toEqual([]);
  });

  test("aucun créneau dans le passé", () => {
    expect(slotsForDate("2026-11-19", settings, now)).toEqual([]);
  });

  test("aujourd'hui, seuls les créneaux à venir sont proposés", () => {
    const tenThirty = new Date(2026, 10, 20, 10, 30);
    expect(slotsForDate("2026-11-20", settings, tenThirty)).toEqual(["11:00"]);
  });

  test("aucun créneau au-delà de la limite de réservation", () => {
    expect(slotsForDate("2026-12-21", settings, now)).toEqual([]);
    expect(slotsForDate("2026-12-19", settings, now)).toEqual(["09:00", "10:00", "11:00"]);
  });

  test("date invalide → aucun créneau", () => {
    expect(slotsForDate("pas-une-date", settings, now)).toEqual([]);
  });
});

describe("slotsForDate — valeurs par défaut", () => {
  test("utilise l'heure actuelle si aucune n'est fournie", () => {
    expect(slotsForDate("2000-01-03", settings)).toEqual([]);
  });
});
