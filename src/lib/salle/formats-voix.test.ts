import test from "node:test"
import assert from "node:assert/strict"

import {
  cheminDuMorceau,
  extensionDe,
  formatPrefere,
  typeNu,
} from "./formats-voix.ts"

test("Opus est préféré quand le navigateur le sait", () => {
  // C'est le codec de la parole : intelligible à 16 kbit/s là où les autres
  // bafouillent. S'il passe en second, on paie plus cher pour moins bien.
  const f = formatPrefere(() => true)
  assert.equal(f, "audio/webm;codecs=opus")
})

test("Safari retombe sur mp4 plutôt que sur rien", () => {
  const f = formatPrefere((t) => t === "audio/mp4")
  assert.equal(f, "audio/mp4")
})

test("un navigateur qui ne sait rien encoder le dit", () => {
  // `null` et non un format par défaut : déposer dans un format que le
  // navigateur n'écrit pas constituerait un enregistrement vide, en silence.
  assert.equal(formatPrefere(() => false), null)
})

test("l'extension suit le format", () => {
  assert.equal(extensionDe("audio/webm;codecs=opus"), "webm")
  assert.equal(extensionDe("audio/ogg;codecs=opus"), "ogg")
  assert.equal(extensionDe("audio/mp4"), "m4a")
})

test("le type MIME part nu dans le coffre", () => {
  // Le coffre n'autorise que des types nus : « audio/webm;codecs=opus » n'est
  // pas dans sa liste et le téléversement serait refusé.
  assert.equal(typeNu("audio/webm;codecs=opus"), "audio/webm")
  assert.equal(typeNu("audio/mp4"), "audio/mp4")
})

test("le chemin porte la séance puis l'auteur", () => {
  // Cet ordre n'est pas cosmétique : la politique du coffre vérifie que le
  // second dossier est celui de l'appelant. Inversé, chacun pourrait déposer
  // dans la piste de l'autre.
  const c = cheminDuMorceau("seance-1", "moi-2", 7, "webm")
  assert.equal(c, "seance-1/moi-2/000007.webm")
})

test("les rangs se trient dans l'ordre d'écoute", () => {
  // Sans le rembourrage, « 10 » passerait avant « 9 » et le coffre listerait
  // la séance dans le désordre.
  const noms = [1, 2, 10, 100].map((r) =>
    cheminDuMorceau("s", "a", r, "webm"),
  )
  assert.deepEqual([...noms].sort(), noms)
})
