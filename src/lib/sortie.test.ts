import { test } from "node:test"
import assert from "node:assert/strict"

import { effacement, temoinsDeSession } from "./sortie.ts"
import { porteUnTemoinDeSession } from "./acces.ts"

/**
 * Ce qu'un départ doit emporter.
 *
 * La déconnexion et le middleware se répondent : l'un efface ce que l'autre
 * cherche. S'ils cessaient de parler du même objet, cliquer « se déconnecter »
 * ramènerait à l'accueil, encore connecté, sans message — le genre de panne
 * muette qui a déjà coûté deux journées ici.
 *
 * D'où le dernier test, qui n'interroge pas une fonction mais l'accord entre
 * les deux.
 */

const COOKIES_DECOUPES =
  "theme=sombre; sb-abcdef-auth-token.0=base64-xxxx; sb-abcdef-auth-token.1=suite; langue=fr"

test("reconnaît un témoin de session simple", () => {
  assert.deepEqual(temoinsDeSession("sb-abcdef-auth-token=valeur"), [
    "sb-abcdef-auth-token",
  ])
})

test("emporte les deux morceaux d'un témoin découpé", () => {
  assert.deepEqual(temoinsDeSession(COOKIES_DECOUPES), [
    "sb-abcdef-auth-token.0",
    "sb-abcdef-auth-token.1",
  ])
})

test("laisse en place ce qui n'est pas une session", () => {
  assert.deepEqual(temoinsDeSession("theme=sombre; langue=fr; consentement=1"), [])
})

test("ne confond pas une préférence Supabase avec une session", () => {
  assert.deepEqual(temoinsDeSession("sb-abcdef-provider=google"), [])
})

test("supporte les espaces absents et la chaîne vide", () => {
  assert.deepEqual(temoinsDeSession("a=1;sb-x-auth-token=2;b=3"), [
    "sb-x-auth-token",
  ])
  assert.deepEqual(temoinsDeSession(""), [])
})

test("l'effacement vise le même chemin que la pose", () => {
  // `@supabase/ssr` pose sur `/`. Viser ailleurs créerait un second témoin
  // au lieu de remplacer le premier, qui resterait valable.
  const ligne = effacement("sb-abcdef-auth-token")
  assert.match(ligne, /^sb-abcdef-auth-token=;/)
  assert.match(ligne, /Path=\/(;|$)/)
  assert.match(ligne, /Max-Age=0/)
})

test("ce que le départ efface est exactement ce que le middleware cherche", () => {
  const avant = temoinsDeSession(COOKIES_DECOUPES)
  assert.equal(porteUnTemoinDeSession(avant), true)

  const apres = COOKIES_DECOUPES.split("; ")
    .filter((paire) => !avant.includes(paire.split("=")[0]))
    .map((paire) => paire.split("=")[0])
  assert.equal(porteUnTemoinDeSession(apres), false)
})
