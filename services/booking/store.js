"use strict";

const crypto = require("crypto");

class SlotTakenError extends Error {
  constructor() {
    super("Ce créneau est déjà réservé.");
    this.name = "SlotTakenError";
  }
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I pour éviter les confusions

function randomId(length = 8) {
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length]; // 256 % 32 === 0 → pas de biais
  return id;
}

/**
 * Stockage en mémoire (perdu au redémarrage). Même interface à respecter
 * pour une future version Redis / base de données.
 */
function createMemoryStore({ now = () => new Date() } = {}) {
  const byId = new Map();
  const bySlot = new Map();

  return {
    create(appointment) {
      const slotKey = `${appointment.date} ${appointment.time}`;
      if (bySlot.has(slotKey)) throw new SlotTakenError();

      let id;
      do id = randomId(); while (byId.has(id));

      const record = { ...appointment, id, createdAt: now().toISOString() };
      byId.set(id, record);
      bySlot.set(slotKey, id);
      return { ...record };
    },

    get(id) {
      const record = byId.get(id);
      return record ? { ...record } : null;
    },

    takenTimes(date) {
      const times = [];
      for (const key of bySlot.keys()) {
        const [d, t] = key.split(" ");
        if (d === date) times.push(t);
      }
      return times.sort();
    }
  };
}

module.exports = { createMemoryStore, SlotTakenError };
