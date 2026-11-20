"use strict";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Transforme "AAAA-MM-JJ" en Date (minuit, heure locale) ou null si invalide. */
function parseDate(value) {
  if (typeof value !== "string") return null;
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  // Rejette les dates impossibles (ex. 30 février) que Date "corrige" en silence.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

const pad = (n) => String(n).padStart(2, "0");

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const formatTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Liste des créneaux possibles pour une date (sans tenir compte des réservations). */
function slotsForDate(dateString, settings, now = new Date()) {
  const date = parseDate(dateString);
  if (!date || !settings.openDays.includes(date.getDay())) return [];

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + settings.maxDaysAhead);
  if (date < today || date > lastDay) return [];

  const isToday = date.getTime() === today.getTime();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = [];
  const close = toMinutes(settings.closeTime);
  for (let t = toMinutes(settings.openTime); t + settings.slotMinutes <= close; t += settings.slotMinutes) {
    if (!isToday || t > nowMinutes) slots.push(formatTime(t));
  }
  return slots;
}

module.exports = { parseDate, formatDate, slotsForDate };
