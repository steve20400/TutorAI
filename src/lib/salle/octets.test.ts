import { test } from "node:test"
import assert from "node:assert/strict"

import { enOctets, enTexte } from "./octets.ts"

/**
 * L'encodage des mises à jour Yjs.
 *
 * Il n'a l'air de rien et c'est le passage le plus fragile : Yjs produit des
 * octets, Supabase Realtime transporte du JSON, et entre les deux `btoa` ne
 * lit pas un tableau d'octets mais une chaîne où chaque caractère vaut un
 * octet. Un aller-retour qui perd un octet ne casse rien tout de suite — il
 * casse la feuille du jour où quelqu'un dessine assez longtemps.
 *
 * Le dernier cas est celui qui a motivé le découpage par tranches : passer
 * cent mille octets d'un coup à `String.fromCharCode(...)` dépasse la pile
 * d'appels sur certains navigateurs. C'est exactement le document le plus long
 * d'une vraie séance qui tombe, et jamais celui qu'on essaie en développant.
 */

// `btoa`/`atob` n'existent pas d'office dans Node : on les emprunte à Buffer,
// comme le navigateur les expose.
globalThis.btoa ??= (s: string) => Buffer.from(s, "binary").toString("base64")
globalThis.atob ??= (s: string) => Buffer.from(s, "base64").toString("binary")

function allerRetour(octets: Uint8Array): Uint8Array {
  return enOctets(enTexte(octets))
}

test("un aller-retour rend exactement les mêmes octets", () => {
  const source = new Uint8Array([0, 1, 2, 127, 128, 200, 254, 255])
  assert.deepEqual(allerRetour(source), source)
})

test("le vide reste le vide", () => {
  assert.deepEqual(allerRetour(new Uint8Array([])), new Uint8Array([]))
})

test("les 256 valeurs d'un octet survivent", () => {
  const toutes = new Uint8Array(256)
  for (let i = 0; i < 256; i++) toutes[i] = i
  assert.deepEqual(allerRetour(toutes), toutes)
})

test("un document long passe sans faire déborder la pile", () => {
  // Au-delà de la tranche de 0x8000, là où une seule passe échouerait.
  const long = new Uint8Array(200_000)
  for (let i = 0; i < long.length; i++) long[i] = (i * 7) % 256
  assert.deepEqual(allerRetour(long), long)
})
