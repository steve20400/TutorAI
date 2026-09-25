import { test } from "node:test"
import assert from "node:assert/strict"

import { decisionDeRoute } from "./acces.ts"

/**
 * La règle d'accès, lue à voix haute.
 *
 * Le dernier cas de la liste est celui qui donne son existence à ce fichier.
 * `/nouveau-mot-de-passe` figurait parmi les routes publiques, et toute route
 * publique renvoyait chez lui un visiteur déjà connecté. Or c'est le lien du
 * courriel qui ouvre cette session, une seconde plus tôt : on arrivait donc
 * connecté dans son espace sans jamais voir le formulaire, le mot de passe
 * restait l'ancien, et le clic paraissant sans effet, on recliquait le même
 * lien — qui ne sert qu'une fois et répondait « expiré ».
 *
 * Un `&& !sansEcart` manquant, deux pannes, et aucune trace nulle part.
 */

const CAS: Array<[string, boolean, string]> = [
  // --- Sans session -------------------------------------------------------
  ["/", false, "versInscription"],
  ["/connexion", false, "laisser"],
  ["/inscription", false, "laisser"],
  ["/inscription/parent", false, "laisser"],
  ["/mot-de-passe-oublie", false, "laisser"],
  ["/essai", false, "laisser"],
  ["/nouveau-mot-de-passe", false, "laisser"],
  ["/parent", false, "versConnexion"],
  ["/admin/alertes", false, "versConnexion"],
  ["/seance/abc-123", false, "versConnexion"],

  // --- Avec session -------------------------------------------------------
  ["/", true, "laisser"],
  ["/parent", true, "laisser"],
  ["/admin/alertes", true, "laisser"],

  // On renvoie chez lui celui qui est déjà entré.
  ["/connexion", true, "versAccueil"],
  ["/inscription", true, "versAccueil"],
  ["/mot-de-passe-oublie", true, "versAccueil"],

  // Mais jamais ici : la session vient du lien du courriel, et elle est la
  // seule autorisation d'écrire le nouveau mot de passe.
  ["/nouveau-mot-de-passe", true, "laisser"],
]

for (const [chemin, connecte, attendu] of CAS) {
  test(`${connecte ? "connecté" : "visiteur"} sur ${chemin} → ${attendu}`, () => {
    assert.equal(decisionDeRoute(chemin, connecte), attendu)
  })
}
