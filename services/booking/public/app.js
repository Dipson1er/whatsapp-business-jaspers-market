"use strict";

// Toutes les données sont insérées avec textContent / new Option :
// jamais d'innerHTML, donc aucune injection de code possible.
(function () {
  const form = document.getElementById("booking-form");
  const serviceSelect = document.getElementById("service");
  const dateInput = document.getElementById("date");
  const timeSelect = document.getElementById("time");
  const submitBtn = document.getElementById("submit");
  const statusEl = document.getElementById("status");
  const confirmation = document.getElementById("confirmation");
  const confirmationText = document.getElementById("confirmation-text");
  let services = [];

  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function clearErrors() {
    form.querySelectorAll(".error").forEach((el) => { el.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  }

  function showErrors(errors) {
    Object.keys(errors || {}).forEach((field) => {
      const el = form.querySelector(`.error[data-for="${CSS.escape(field)}"]`);
      const input = form.elements[field];
      if (el) el.textContent = errors[field];
      if (input) input.setAttribute("aria-invalid", "true");
    });
  }

  function fillSelect(select, items, placeholder) {
    select.replaceChildren(new Option(placeholder, ""));
    items.forEach(({ value, label }) => select.add(new Option(label, value)));
  }

  async function loadServices() {
    try {
      const res = await fetch("/api/rendez-vous/services");
      services = (await res.json()).services;
      fillSelect(serviceSelect, services.map((s) => ({ value: s.id, label: s.label })), "Choisissez un service");
    } catch {
      setStatus("Impossible de charger les services. Rechargez la page.", true);
    }
  }

  async function loadSlots() {
    timeSelect.disabled = true;
    if (!dateInput.value) {
      fillSelect(timeSelect, [], "Choisissez d'abord une date");
      return;
    }
    fillSelect(timeSelect, [], "Chargement…");
    try {
      const res = await fetch(`/api/rendez-vous/creneaux?date=${encodeURIComponent(dateInput.value)}`);
      const data = await res.json();
      const slots = res.ok ? data.slots : [];
      if (slots.length === 0) {
        fillSelect(timeSelect, [], "Aucun créneau ce jour-là");
        return;
      }
      fillSelect(timeSelect, slots.map((t) => ({ value: t, label: t })), "Choisissez un créneau");
      timeSelect.disabled = false;
    } catch {
      fillSelect(timeSelect, [], "Erreur de chargement");
    }
  }

  async function submit(event) {
    event.preventDefault();
    clearErrors();
    setStatus("");
    submitBtn.disabled = true;

    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/rendez-vous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        const service = services.find((s) => s.id === data.service);
        const [y, m, d] = data.date.split("-");
        confirmationText.textContent =
          `${service ? service.label : "Rendez-vous"} le ${d}/${m}/${y} à ${data.time}. ` +
          `Votre numéro de rendez-vous : ${data.id}.`;
        form.hidden = true;
        confirmation.hidden = false;
        return;
      }
      if (res.status === 409) await loadSlots();
      showErrors(data.errors);
      setStatus(data.error || "Une erreur est survenue.", true);
    } catch {
      setStatus("Connexion impossible. Vérifiez votre réseau et réessayez.", true);
    } finally {
      submitBtn.disabled = false;
    }
  }

  document.getElementById("again").addEventListener("click", () => {
    form.reset();
    confirmation.hidden = true;
    form.hidden = false;
    loadSlots();
  });

  const today = new Date();
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);
  dateInput.min = toISO(today);
  dateInput.max = toISO(max);
  dateInput.addEventListener("change", loadSlots);
  form.addEventListener("submit", submit);
  loadServices();
})();
