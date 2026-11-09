import test from "node:test"
import assert from "node:assert/strict"

import {
  aJeterEnTete,
  BUDGET_OCTETS,
  estUnRefus,
  inutileDEssayer,
  poidsDeLaFile,
  prochainDelai,
} from "./reprise.ts"

test("le délai monte, puis se stabilise à une minute", () => {
  assert.equal(prochainDelai(0), 2000)
  assert.equal(prochainDelai(1), 4000)
  assert.equal(prochainDelai(2), 8000)
  // Le palier : sans lui, après vingt minutes de coupure on réessaierait
  // toutes les trois heures et le retour du réseau ne servirait à rien.
  assert.equal(prochainDelai(20), 60_000)
  assert.equal(prochainDelai(999), 60_000)
})

test("un droit refusé est un refus, pas une coupure", () => {
  // Réessayer mille fois une politique qui dit non ne la fera pas changer
  // d'avis, et le tampon grossirait sans fin.
  assert.equal(estUnRefus({ code: "42501" }), true)
  assert.equal(estUnRefus({ statusCode: 403 }), true)
  assert.equal(estUnRefus({ status: 400 }), true)
})

test("un doublon est un refus : le réessayer serait nuisible", () => {
  // Le morceau est déjà déposé. Insister ferait entendre deux fois le même
  // passage si la contrainte venait à sauter.
  assert.equal(estUnRefus({ code: "23505" }), true)
  assert.equal(estUnRefus({ statusCode: 409 }), true)
})

test("une panne réseau n'est pas un refus", () => {
  // Le bon côté sur lequel se tromper : garder un morceau indéposable coûte
  // de la mémoire ; jeter un morceau déposable coûte la parole d'un enfant.
  assert.equal(estUnRefus(new TypeError("Failed to fetch")), false)
  assert.equal(estUnRefus({ statusCode: 503 }), false)
  assert.equal(estUnRefus({ statusCode: 500 }), false)
  assert.equal(estUnRefus(undefined), false)
  assert.equal(estUnRefus("réseau indisponible"), false)
})

test("le budget tient près de deux heures de parole", () => {
  // 24 kbit/s × 3600 s ≈ 10,5 Mo l'heure. Le budget doit couvrir une coupure
  // plus longue que la séance elle-même.
  const heureEnOctets = (24_000 * 3600) / 8
  assert.ok(BUDGET_OCTETS > heureEnOctets * 1.5)
})

test("rien n'est jeté tant qu'on tient dans le budget", () => {
  assert.equal(aJeterEnTete([100, 200, 300], 50, 10_000), 0)
})

test("on jette les plus anciens, et juste assez", () => {
  // Jeter les plus récents reviendrait à ne jamais rattraper le retard : on
  // effacerait précisément ce qu'on vient d'enregistrer.
  assert.equal(aJeterEnTete([100, 100, 100], 100, 250), 2)
})

test("le poids d'une file vide est nul", () => {
  assert.equal(poidsDeLaFile([]), 0)
  assert.equal(aJeterEnTete([], 999, 100), 0)
})

test("hors ligne, on n'essaie même pas", () => {
  assert.equal(inutileDEssayer(false), true)
})

test("en ligne ou inconnu, on essaie quand même", () => {
  // `navigator.onLine` dit « en ligne » dès qu'une carte est branchée, même
  // sans Internet derrière. On ne s'en sert que pour ÉVITER un essai voué à
  // l'échec, jamais pour déclarer que tout va bien.
  assert.equal(inutileDEssayer(true), false)
  assert.equal(inutileDEssayer(undefined), false)
})
