import test from "node:test"
import assert from "node:assert/strict"

import {
  enTaille,
  minimumPour,
  montantRequis,
  poidsParHeure,
  resolutionTenable,
} from "./enregistrement.ts"

test("le cahier seul tient dans un demi-mégaoctet par heure", () => {
  const mo = poidsParHeure("cahier", 24, 300)
  assert.ok(mo < 0.5, `attendu < 0,5 Mo, reçu ${String(mo)}`)
})

test("le son coûte un ordre de grandeur de moins que l'image", () => {
  const audio = poidsParHeure("audio", 24, 300)
  const video = poidsParHeure("video", 24, 300)
  assert.ok(
    video > audio * 8,
    `l'image devrait coûter bien plus : ${String(audio)} vs ${String(video)}`,
  )
})

test("une heure de son à 24 kbit/s pèse une dizaine de mégaoctets", () => {
  // 24 kbit/s × 3600 s ÷ 8 ÷ 1024 ≈ 10,5 Mo. Le repère qu'on affiche à
  // l'administration : si ce chiffre dérive, l'écran ment sur la facture.
  const mo = poidsParHeure("audio", 24, 300)
  assert.ok(mo > 10 && mo < 11.5, `reçu ${String(mo)}`)
})

test("la vidéo compte aussi le son et le cahier", () => {
  const video = poidsParHeure("video", 24, 300)
  const audio = poidsParHeure("audio", 24, 300)
  // La vidéo = le cahier + le son + l'image. Donc strictement plus que le son
  // seul, de la valeur de l'image.
  assert.ok(video > audio)
})

test("le cahier n'exige aucun débit montant continu", () => {
  // Il part par bouffées : une connexion mauvaise l'avale quand même.
  assert.equal(montantRequis("cahier", 24, 300), 0)
})

test("le montant exigé en vidéo additionne le son et l'image", () => {
  assert.equal(montantRequis("video", 24, 300), 324)
  assert.equal(montantRequis("audio", 24, 300), 24)
})

test("720p à 150 kbit/s est refusé, 720p à 600 est tenu", () => {
  assert.equal(resolutionTenable("720p", 150), false)
  assert.equal(resolutionTenable("720p", 600), true)
})

test("360p se contente de 150 kbit/s", () => {
  assert.equal(resolutionTenable("360p", 150), true)
})

test("une résolution inconnue ne bloque pas l'écran", () => {
  // Un réglage venu de la base avec une valeur qu'on ne connaît pas ne doit
  // pas afficher un avertissement faux. On se tait plutôt que d'inventer.
  assert.equal(resolutionTenable("1080p", 150), true)
  assert.equal(minimumPour("1080p"), 0)
})

test("la taille change d'unité au-dessus du millier", () => {
  assert.match(enTaille(10.5, "fr"), /10,5 Mo/)
  assert.match(enTaille(2048, "fr"), /2,0 Go/)
})

test("la taille suit la langue", () => {
  // Virgule en français, point en anglais : un chiffre mal ponctué se lit de
  // travers, et celui-ci est un chiffre de facture.
  assert.match(enTaille(10.5, "fr"), /10,5/)
  assert.match(enTaille(10.5, "en"), /10\.5/)
})
