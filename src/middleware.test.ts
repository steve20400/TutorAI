import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

/**
 * Le même piège s'est refermé quatre fois : `sw.js`, `/carte/osm.json`,
 * puis `/auth/confirm`. À chaque fois, le middleware ajoutait la langue à une
 * adresse qui n'en a pas, le serveur rendait une page HTML ou un 404, et
 * l'appelant — un navigateur, MapLibre, un parent — recevait autre chose que
 * ce qu'il attendait. Sans erreur nulle part.
 *
 * Ce test lit le motif directement dans `middleware.ts` plutôt que de
 * l'importer : Next exige que `config.matcher` soit une chaîne littérale,
 * analysable à la compilation, donc elle ne peut pas venir d'un module
 * partagé. On la relit donc telle qu'elle est écrite.
 */
function motifDuMiddleware(): RegExp {
  const source = readFileSync(
    new URL("./middleware.ts", import.meta.url),
    "utf-8",
  )
  const trouve = source.match(/matcher:\s*\[\s*(?:\/\*[\s\S]*?\*\/\s*)?"([^"]+)"/)
  assert.ok(trouve, "Le motif du matcher est introuvable dans middleware.ts")
  // La chaîne est écrite pour JavaScript : `\\.` dans le fichier vaut `\.`
  // une fois lue. `readFileSync` rend le texte brut, il faut le défaire.
  return new RegExp(`^${trouve[1].replace(/\\\\/g, "\\")}$`)
}

/** Ce qui DOIT passer par le middleware : toute page, qui porte une langue. */
const PAGES = [
  "/",
  "/fr",
  "/en/connexion",
  "/fr/mot-de-passe-oublie",
  "/fr/admin/alertes",
  "/en/seance/abc-123",
  "/fr/tuteur/nouveau",
]

/** Ce qui ne doit JAMAIS y passer : rien de tout cela n'a de langue. */
const HORS_LANGUE = [
  "/auth/confirm",
  "/api/photo",
  "/api/seance/abc/message",
  "/sw.js",
  "/favicon.ico",
  "/carte/osm.json",
  "/manifest.webmanifest",
  "/courriel/marque-clair.png",
  "/courriel/marque-sombre.png",
  "/motif-education.svg",
  "/icones/192.png",
  "/_next/static/chunks/main.js",
]

test("le middleware traite les pages", () => {
  const motif = motifDuMiddleware()
  for (const chemin of PAGES) {
    assert.ok(
      motif.test(chemin),
      `${chemin} devrait passer par le middleware pour recevoir sa langue`,
    )
  }
})

test("le middleware laisse passer ce qui n'a pas de langue", () => {
  const motif = motifDuMiddleware()
  for (const chemin of HORS_LANGUE) {
    assert.ok(
      !motif.test(chemin),
      `${chemin} ne doit pas être préfixé d'une langue — c'est ainsi que ` +
        `sw.js, osm.json et /auth/confirm ont cassé, chacun en silence`,
    )
  }
})
