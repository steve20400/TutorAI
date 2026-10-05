import { test } from "node:test"
import assert from "node:assert/strict"

import { sureteDuMotDePasse } from "./surete.ts"

/**
 * Ce que la jauge promet.
 *
 * Les deux derniers cas sont la raison d'être du fichier : une jauge qui
 * félicite `Password1!` et gronde `les trois chats de ma grand mère` apprend
 * le contraire de ce qu'il faut savoir, et elle le fait avec autorité.
 */

test("sous le minimum, rien n'est bon", () => {
  assert.equal(sureteDuMotDePasse("abc", 8), 0)
  assert.equal(sureteDuMotDePasse("1234567", 8), 0)
  // Six suffit pour un enfant, et le même mot de passe reste court pour un adulte.
  assert.equal(sureteDuMotDePasse("bateau", 6), 1)
  assert.equal(sureteDuMotDePasse("bateau", 8), 0)
})

test("la longueur décide", () => {
  assert.equal(sureteDuMotDePasse("cafetiere", 8), 1)
  assert.equal(sureteDuMotDePasse("cafetierebleue", 8), 2)
  assert.equal(sureteDuMotDePasse("la cafetiere bleue du salon", 8), 3)
})

test("la variété ajoute, sans suffire", () => {
  assert.equal(sureteDuMotDePasse("Ab3$kpwm", 8), 2)
  // `efgh` est une suite de l'alphabet : les quatre familles ne la rachètent
  // pas. C'est voulu — le premier essai d'une attaque, ce sont les suites.
  assert.equal(sureteDuMotDePasse("Ab3$efgh", 8), 1)
})

test("une seule lettre répétée ne vaut rien", () => {
  assert.equal(sureteDuMotDePasse("aaaaaaaaaaaaaaaa", 8), 1)
})

test("une suite du clavier ou de l'alphabet ne vaut rien", () => {
  assert.equal(sureteDuMotDePasse("abcdefghijkl", 8), 1)
  assert.equal(sureteDuMotDePasse("monazertyici", 8), 1)
  assert.equal(sureteDuMotDePasse("mon4321secret", 8), 1)
})

test("son propre prénom dans son mot de passe ne vaut rien", () => {
  assert.equal(sureteDuMotDePasse("steve-le-grand-maitre", 8, ["Steve"]), 1)
  // Deux lettres ne condamnent pas : ce serait une coïncidence, pas un indice.
  assert.equal(sureteDuMotDePasse("la cafetiere bleue du salon", 8, ["Li"]), 3)
})

test("la variété ne rachète pas un mot de passe court et banal", () => {
  // Majuscule, minuscule, chiffre et symbole — et quelques secondes à casser.
  const theatral = sureteDuMotDePasse("Password1!", 8)
  const long = sureteDuMotDePasse("les trois chats de ma grand mere", 8)
  assert.ok(
    long > theatral,
    "une phrase longue doit passer devant un mot court décoré",
  )
})
