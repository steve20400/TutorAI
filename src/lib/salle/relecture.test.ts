import test from "node:test"
import assert from "node:assert/strict"

import {
  avancer,
  dureeTotale,
  enHorloge,
  faudraitReconstruire,
  fenetre,
} from "./relecture.ts"

const G = [{ t: 0 }, { t: 1000 }, { t: 2500 }, { t: 9000 }]

test("la fenêtre prend ce qui vient d'arriver, pas ce qui était déjà là", () => {
  // Bornes ouvertes à gauche : un geste exactement à la position courante a
  // déjà été appliqué. Sans cette asymétrie, le premier geste d'une séance
  // serait appliqué deux fois au démarrage.
  assert.deepEqual(fenetre(G, 0, 2500), [1, 2])
  assert.deepEqual(fenetre(G, 1000, 1000), [])
})

test("au démarrage, le geste à zéro est pris une fois", () => {
  assert.deepEqual(fenetre(G, -1, 0), [0])
})

test("la fenêtre s'arrête net, sans parcourir toute la séance", () => {
  assert.deepEqual(fenetre(G, 2500, 100_000), [3])
  assert.deepEqual(fenetre(G, 9000, 100_000), [])
})

test("reculer impose de tout reconstruire", () => {
  // Yjs sait appliquer une mise à jour, pas la retirer. Reculer, c'est
  // repartir d'un document vide et rejouer jusqu'au point voulu.
  assert.equal(faudraitReconstruire(5000, 1000), true)
  assert.equal(faudraitReconstruire(1000, 5000), false)
  assert.equal(faudraitReconstruire(1000, 1000), false)
})

test("la durée est la position du dernier geste", () => {
  assert.equal(dureeTotale(G), 9000)
  assert.equal(dureeTotale([]), 0)
})

test("la lecture ne dépasse pas la fin", () => {
  // Une position qui dépasse ferait glisser la barre hors de son rail.
  assert.equal(avancer(8000, 5000, 1, 9000), 9000)
  assert.equal(avancer(0, 1000, 4, 9000), 4000)
  assert.equal(avancer(0, -5000, 1, 9000), 0)
})

test("l'horloge ne montre l'heure que si elle existe", () => {
  // « 0:12:34 » pour une séance de douze minutes se lit moins vite, et une
  // barre de lecture se lit du coin de l'œil.
  assert.equal(enHorloge(0), "0:00")
  assert.equal(enHorloge(62_000), "1:02")
  assert.equal(enHorloge(754_000), "12:34")
  assert.equal(enHorloge(3_723_000), "1:02:03")
})
