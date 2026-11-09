import test from "node:test"
import assert from "node:assert/strict"

import { enLignes, inline, signes } from "./texte-riche.ts"

test("le gras perd ses étoiles", () => {
  // Le défaut signalé : un élève lisait « **important** » et se demandait ce
  // que les étoiles voulaient dire.
  assert.deepEqual(inline("c'est **important** ici"), [
    { t: "mot", v: "c'est " },
    { t: "gras", v: "important" },
    { t: "mot", v: " ici" },
  ])
})

test("une multiplication ne devient pas de l'italique", () => {
  // `3 * 4` avec des espaces : c'est un calcul, pas une emphase. Sans cette
  // distinction, la multiplication disparaîtrait en italique.
  assert.deepEqual(inline("3 * 4 = 12"), [{ t: "mot", v: "3 × 4 = 12" }])
})

test("l'italique collé au mot est bien de l'italique", () => {
  assert.deepEqual(inline("le mot *doux* ici"), [
    { t: "mot", v: "le mot " },
    { t: "italique", v: "doux" },
    { t: "mot", v: " ici" },
  ])
})

test("le code garde ses correspondances de clavier", () => {
  // Quand un élève demande comment on écrit quelque chose, la réponse est ce
  // qu'il doit TAPER, pas sa jolie version.
  assert.deepEqual(inline("tape `x <= 3` pour voir"), [
    { t: "mot", v: "tape " },
    { t: "code", v: "x <= 3" },
    { t: "mot", v: " pour voir" },
  ])
})

test("les signes de l'école remplacent ceux du clavier", () => {
  assert.equal(signes("x <= 3"), "x ≤ 3")
  assert.equal(signes("x >= 3"), "x ≥ 3")
  assert.equal(signes("x != 3"), "x ≠ 3")
  assert.equal(signes("a -> b"), "a → b")
  assert.equal(signes("a => b"), "a ⇒ b")
  assert.equal(signes("+-5"), "±5")
})

test("le carré s'écrit comme au tableau", () => {
  assert.equal(signes("x^2 + 1"), "x² + 1")
  assert.equal(signes("x^3"), "x³")
})

test("un exposant à deux chiffres garde sa forme", () => {
  // `2^10` n'a pas d'exposant typographique : l'écrire « 2¹0 » serait faux.
  assert.equal(signes("2^10"), "2^10")
})

test("sqrt devient le signe de la racine", () => {
  assert.equal(signes("sqrt(2)"), "√(2)")
})

test("aucun mot français n'est abîmé", () => {
  // La liste ne contient que des correspondances impossibles à déclencher sur
  // du français. Ce qui est ambigu en est volontairement absent.
  const phrase = "La moitié 1/2 de la pizza, pi est un nombre, c'est-à-dire."
  assert.equal(signes(phrase), phrase)
})

test("les puces et les numéros sont reconnus", () => {
  const l = enLignes("Les étapes :\n- d'abord ceci\n2. puis cela")
  assert.equal(l[0]?.t, "paragraphe")
  assert.equal(l[1]?.t, "puce")
  assert.equal(l[2]?.t, "numero")
  assert.equal(l[2]?.t === "numero" ? l[2].n : "", "2")
})

test("un titre perd ses dièses", () => {
  const l = enLignes("## Les fractions")
  assert.equal(l[0]?.t, "titre")
  assert.deepEqual(l[0]?.t === "titre" ? l[0].contenu : [], [
    { t: "mot", v: "Les fractions" },
  ])
})

test("une ligne vide reste une respiration", () => {
  // Sans elle, deux paragraphes se collent et le texte devient un bloc.
  const l = enLignes("un\n\ndeux")
  assert.equal(l[1]?.t, "vide")
})
