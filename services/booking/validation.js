"use strict";

const { parseDate, slotsForDate } = require("./schedule");

const NAME_RE = /^\p{L}[\p{L}\p{M}' .-]*$/u;
const PHONE_RE = /^\+?\d{8,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Caractères de contrôle, sauf retour à la ligne (\n) et tabulation (\t).
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

const isString = (v) => typeof v === "string";

/**
 * Vérifie et nettoie une demande de rendez-vous.
 * Ne garde QUE les champs connus : tout le reste est ignoré.
 * @returns {{ok: true, value: object} | {ok: false, errors: object, bot?: boolean}}
 */
function validateAppointment(input, settings, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: { form: "Demande invalide." } };
  }

  // Champ piège : invisible pour un humain, rempli par les robots.
  if (input.website) {
    return { ok: false, bot: true, errors: { form: "Demande refusée." } };
  }

  const errors = {};
  const value = {};

  const serviceIds = settings.services.map((s) => s.id);
  if (isString(input.service) && serviceIds.includes(input.service)) {
    value.service = input.service;
  } else {
    errors.service = "Choisissez un service.";
  }

  const slots = slotsForDate(input.date, settings, now);
  if (parseDate(input.date) && slots.length > 0) {
    value.date = input.date;
  } else {
    errors.date = "Choisissez une date d'ouverture valide.";
  }

  if (isString(input.time) && slots.includes(input.time)) {
    value.time = input.time;
  } else {
    errors.time = "Choisissez un créneau disponible.";
  }

  const name = isString(input.name) ? input.name.trim().replace(/\s+/g, " ") : "";
  if (name.length >= 2 && name.length <= 80 && NAME_RE.test(name)) {
    value.name = name;
  } else {
    errors.name = "Indiquez votre nom (2 à 80 lettres).";
  }

  const phone = isString(input.phone) ? input.phone.replace(/[\s.()-]/g, "") : "";
  if (PHONE_RE.test(phone)) {
    value.phone = phone;
  } else {
    errors.phone = "Indiquez un numéro de téléphone valide.";
  }

  if (input.email === undefined || input.email === null || input.email === "") {
    value.email = "";
  } else {
    const email = isString(input.email) ? input.email.trim().toLowerCase() : "";
    if (email.length <= 254 && EMAIL_RE.test(email)) {
      value.email = email;
    } else {
      errors.email = "Adresse e-mail invalide.";
    }
  }

  if (input.notes === undefined || input.notes === null) {
    value.notes = "";
  } else if (isString(input.notes)) {
    const notes = input.notes.replace(CONTROL_CHARS_RE, "").trim();
    if (notes.length <= 500) {
      value.notes = notes;
    } else {
      errors.notes = "500 caractères maximum.";
    }
  } else {
    errors.notes = "Remarque invalide.";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

module.exports = { validateAppointment };
