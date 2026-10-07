import { test } from "node:test"
import assert from "node:assert/strict"

import { lireExpression } from "./expression.ts"

/**
 * L'évaluateur du traceur.
 *
 * Il mérite des tests pour deux raisons, et la seconde compte plus que la
 * première. Une courbe fausse ne se voit pas : elle a l'air d'une courbe, et
 * c'est un cours de mathématiques qu'on donne dessus. Et l'expression vient de
 * l'autre côté du réseau — ce qui est refusé ici est ce qui n'entrera pas dans
 * le navigateur d'un enfant.
 */

function evalue(source: string, x: number): number | null {
  const f = lireExpression(source)
  return f ? f(x) : null
}

const proche = (a: number | null, b: number) =>
  a !== null && Math.abs(a - b) < 1e-9

test("les quatre opérations, et la priorité", () => {
  assert.equal(evalue("2+3*4", 0), 14)
  assert.equal(evalue("(2+3)*4", 0), 20)
  assert.equal(evalue("10-2-3", 0), 5)
  assert.equal(evalue("12/3/2", 0), 2)
})

test("x est l'inconnue", () => {
  assert.equal(evalue("x", 7), 7)
  assert.equal(evalue("x*x", 5), 25)
  assert.equal(evalue("(2x+1)/(x-1)", 3), 3.5)
})

test("la multiplication implicite, comme au tableau", () => {
  assert.equal(evalue("2x", 5), 10)
  assert.equal(evalue("3(x+1)", 2), 9)
  assert.equal(evalue("2x(x+1)", 3), 24)
})

test("la puissance est associative à droite", () => {
  // 2^(3^2) = 512, et non (2^3)^2 = 64. C'est la convention des
  // mathématiques, pas celle de la plupart des langages — et c'est la bonne
  // ici, puisque c'est un cours de mathématiques.
  assert.equal(evalue("2^3^2", 0), 512)
  assert.equal(evalue("x^2", 4), 16)
})

test("le moins unaire", () => {
  assert.equal(evalue("-x", 3), -3)
  assert.equal(evalue("-2^2", 0), -4)
  assert.equal(evalue("3*-2", 0), -6)
  // L'exposant accepte un signe, la base non : on écrit 2^-1 tous les jours.
  assert.equal(evalue("2^-1", 0), 0.5)
})

test("les fonctions et les constantes de la liste fermée", () => {
  assert.ok(proche(evalue("sin(0)", 0), 0))
  assert.ok(proche(evalue("cos(0)", 0), 1))
  assert.equal(evalue("sqrt(9)", 0), 3)
  assert.equal(evalue("abs(-4)", 0), 4)
  assert.ok(proche(evalue("ln(e)", 0), 1))
  assert.ok(proche(evalue("sin(pi)", 0), 0))
  assert.equal(evalue("2sin(0)+1", 0), 1)
})

test("un point où la courbe n'existe pas rend NaN, pas une erreur", () => {
  // Le traceur lève son crayon et continue : c'est précisément ce qu'on veut
  // montrer d'une fonction qui a une asymptote.
  assert.ok(Number.isNaN(evalue("1/x", 0) as number))
  assert.ok(Number.isNaN(evalue("sqrt(x)", -1) as number))
  assert.ok(Number.isNaN(evalue("ln(x)", 0) as number))
})

test("ce qui n'est pas une expression est refusé, pas deviné", () => {
  // Refuser entièrement plutôt que garder le début : garder le début ferait
  // tracer une courbe qui n'est pas celle qu'on a écrite, ce qui est pire que
  // de ne rien tracer.
  assert.equal(lireExpression(""), null)
  assert.equal(lireExpression("2x)"), null)
  assert.equal(lireExpression("(2x"), null)
  assert.equal(lireExpression("2+"), null)
  assert.equal(lireExpression("sin"), null)
})

test("rien d'autre que les mathématiques n'entre", () => {
  // L'expression vient de l'autre côté du réseau. Ce qui est refusé ici est ce
  // qui n'entrera jamais dans le navigateur d'un enfant.
  assert.equal(lireExpression("alert(1)"), null)
  assert.equal(lireExpression("window"), null)
  assert.equal(lireExpression("x; alert(1)"), null)
  assert.equal(lireExpression("[1].map(x=>x)"), null)
  assert.equal(lireExpression("globalThis"), null)
})
