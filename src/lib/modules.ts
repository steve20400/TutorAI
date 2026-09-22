/**
 * Modules pilotables, dans l'ordre d'affichage.
 *
 * Dans un fichier à part et non dans la page : Next.js n'autorise qu'une liste
 * fermée d'exports depuis un fichier de page, et la compilation échoue sur
 * tout le reste.
 */
export const MODULES = [
  "enregistrement_actif",
  "ia_active",
  "paiement_actif",
  "portefeuille_actif",
  "inscriptions_ouvertes",
] as const

export type CleModule = (typeof MODULES)[number]
