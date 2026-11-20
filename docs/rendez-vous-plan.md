# Page de prise de rendez-vous — Plan

## Objectif
Permettre à un client de réserver un créneau en ligne (service, date, heure,
nom, téléphone), sans pouvoir réserver deux fois le même créneau.

## Parcours client
1. Le client ouvre `/rendez-vous`.
2. Il choisit un service et une date.
3. La page affiche les créneaux encore libres pour ce jour.
4. Il remplit son nom, son téléphone (e-mail et remarque facultatifs) et valide.
5. Il voit une confirmation avec un numéro de rendez-vous.

## Découpage du code (`services/booking/`)
| Fichier | Rôle |
|---|---|
| `settings.js` | Horaires d'ouverture, durée d'un créneau, liste des services (à adapter à l'entreprise) |
| `schedule.js` | Calcule les créneaux possibles d'un jour (fermé le dimanche, pas de créneau passé, pas plus de 60 jours à l'avance) |
| `validation.js` | Vérifie et nettoie tout ce que le client envoie |
| `store.js` | Garde les rendez-vous et refuse un créneau déjà pris |
| `security.js` | En-têtes de sécurité, limite de requêtes, contrôle de l'origine |
| `router.js` | Les adresses web (page, créneaux, réservation) |
| `public/` | La page HTML, son style et son script |

## Adresses web
- `GET  /rendez-vous` : la page
- `GET  /api/rendez-vous/creneaux?date=AAAA-MM-JJ` : créneaux libres (aucune donnée personnelle renvoyée)
- `POST /api/rendez-vous` : crée le rendez-vous (201), 400 si invalide, 409 si créneau pris, 429 si trop de requêtes

## Sécurité
- Validation stricte côté serveur (le navigateur ne fait jamais foi).
- Corps de requête limité à 10 Ko, JSON obligatoire.
- Refus des requêtes venant d'un autre site (contrôle `Origin`) → protège contre le CSRF.
- Limite de 10 réservations / 15 min par adresse IP.
- Champ piège invisible (« honeypot ») contre les robots.
- En-têtes : Content-Security-Policy stricte, anti-iframe, nosniff, pas de cache.
- Le script de la page n'utilise jamais `innerHTML` avec des données (pas d'injection XSS).
- Aucune donnée personnelle dans les journaux ni dans les réponses publiques.

## Méthode : tests d'abord (TDD)
1. Écrire les tests qui décrivent le comportement attendu → ils échouent (rouge).
2. Écrire le code minimal → ils passent (vert).
3. Ajouter les tests de sécurité, puis compléter jusqu'à ≥ 80 % de couverture.

## Limites connues / suites possibles
- Stockage en mémoire : les rendez-vous sont perdus au redémarrage. Étape suivante :
  brancher Redis (déjà présent dans le projet) ou une base de données.
- Envoi d'une confirmation WhatsApp au client via `GraphApi` (déjà présent).
- Une page d'administration (protégée par mot de passe) pour voir/annuler les rendez-vous.
