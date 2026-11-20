"use strict";

/**
 * Réglages de la prise de rendez-vous. Adaptez-les à votre entreprise.
 * Les jours suivent la convention JavaScript : 0 = dimanche, 1 = lundi, … 6 = samedi.
 * Les heures sont celles du fuseau horaire du serveur (variable TZ).
 */
module.exports = Object.freeze({
  openDays: [1, 2, 3, 4, 5, 6],
  openTime: "09:00",
  closeTime: "18:00",
  slotMinutes: 30,
  maxDaysAhead: 60,
  services: [
    { id: "retrait", label: "Retrait de commande" },
    { id: "conseil", label: "Conseil produits" },
    { id: "livraison", label: "Livraison à domicile" }
  ]
});
