"use strict";

const { createMemoryStore, SlotTakenError } = require("../../services/booking/store");

const appt = (overrides = {}) => ({
  service: "retrait",
  date: "2026-11-23",
  time: "10:00",
  name: "Marie Dupont",
  phone: "+33612345678",
  email: "",
  notes: "",
  ...overrides
});

describe("createMemoryStore", () => {
  test("crée un rendez-vous avec un identifiant et une date de création", () => {
    const store = createMemoryStore({ now: () => new Date("2026-11-20T08:00:00Z") });
    const created = store.create(appt());
    expect(created.id).toMatch(/^[A-Z0-9]{8}$/);
    expect(created.createdAt).toBe("2026-11-20T08:00:00.000Z");
    expect(created.name).toBe("Marie Dupont");
  });

  test("refuse de réserver deux fois le même créneau", () => {
    const store = createMemoryStore();
    store.create(appt());
    expect(() => store.create(appt({ name: "Paul" }))).toThrow(SlotTakenError);
  });

  test("le même horaire un autre jour reste libre", () => {
    const store = createMemoryStore();
    store.create(appt());
    expect(() => store.create(appt({ date: "2026-11-24" }))).not.toThrow();
  });

  test("liste les horaires pris d'un jour", () => {
    const store = createMemoryStore();
    store.create(appt({ time: "11:00" }));
    store.create(appt({ time: "09:00" }));
    store.create(appt({ date: "2026-11-24", time: "10:00" }));
    expect(store.takenTimes("2026-11-23")).toEqual(["09:00", "11:00"]);
    expect(store.takenTimes("2026-11-25")).toEqual([]);
  });

  test("retrouve un rendez-vous par identifiant et renvoie une copie", () => {
    const store = createMemoryStore();
    const created = store.create(appt());
    const found = store.get(created.id);
    expect(found).toEqual(created);
    found.name = "modifié";
    expect(store.get(created.id).name).toBe("Marie Dupont");
    expect(store.get("INCONNU")).toBeNull();
  });

  test("les identifiants sont uniques", () => {
    const store = createMemoryStore();
    const ids = new Set();
    for (let h = 0; h < 50; h++) {
      ids.add(store.create(appt({ date: `2026-12-${String((h % 28) + 1).padStart(2, "0")}`, time: `${String(h).padStart(2, "0")}:00` })).id);
    }
    expect(ids.size).toBe(50);
  });
});
