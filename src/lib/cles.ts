/**
 * Les clés d'accès, en un seul endroit.
 *
 * Elles étaient listées deux fois : une fois dans la page, pour l'ordre
 * d'affichage, une fois dans l'action, pour autoriser l'écriture. Ajouter
 * Gemini à la première et pas à la seconde a donné le pire des cas — la clé
 * s'affichait, le bouton répondait, et l'action ressortait SANS RIEN DIRE.
 * L'administration a cru enregistrer trois fois de suite.
 *
 * Une seule liste, désormais. Ajouter une clé ici suffit.
 *
 * L'ordre est celui de l'affichage : la carte d'abord, elle est la seule déjà
 * en service ; puis les trois fournisseurs d'IA ; puis l'argent, éteint tant
 * qu'il n'y a pas de société.
 */
export const CLES = [
  "contact_administration",
  "carte_style",
  "carte_cle",
  "anthropic",
  "gemini",
  "ia_compatible",
  "ia_compatible_url",
  "orange",
  "mtn",
] as const

export type NomDeCle = (typeof CLES)[number]

export function estUneCle(nom: string): nom is NomDeCle {
  return (CLES as readonly string[]).includes(nom)
}
