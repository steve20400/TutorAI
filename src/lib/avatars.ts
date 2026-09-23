/**
 * Avatars proposés aux élèves.
 *
 * Des motifs, pas des visages. Un enfant ne dépose pas sa photo sur cette
 * plateforme — la règle est tenue par un déclencheur en base — et lui offrir
 * des personnages à choisir reviendrait à lui demander de se représenter
 * devant des adultes qu'il ne connaît pas encore.
 *
 * Aucun œil, aucun triangle, aucun compas, aucun soleil à rayons : ces signes
 * évoquent les sectes au Cameroun, et un enfant ne doit pas avoir à expliquer
 * chez lui pourquoi son compte en porte un.
 *
 * Les dessins sont ici et non dans `/public` : douze fichiers feraient douze
 * requêtes pour une grille qu'on affiche d'un coup, et un avatar de 300 octets
 * ne mérite pas un aller-retour réseau.
 */

export type Avatar = {
  /** Rangé tel quel dans `profils.photo_url` : `avatar:01`. */
  cle: string
  fond: string
  trait: string
  /** Tracé dans un carré de 48 × 48. */
  forme: string
}

/**
 * Repli, si le service ne répond pas.
 *
 * Les cinquante avatars vivent en base et se lisent par `/v1/avatars` : en
 * ajouter un ne demande alors aucun déploiement. Ces douze-là restent ici
 * pour qu'un enfant puisse quand même choisir pendant une panne — un écran
 * de choix vide est un écran dont on ne sort pas.
 */
export const AVATARS: readonly Avatar[] = [
  { cle: "01", fond: "#d9c9a8", trait: "#5b4a2f", forme: "M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0" },
  { cle: "02", fond: "#d9c9a8", trait: "#5b4a2f", forme: "M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0" },
  { cle: "03", fond: "#d9c9a8", trait: "#5b4a2f", forme: "M13 33c4-12 8-16 11-16s7 4 11 16" },
  { cle: "11", fond: "#c6d6c9", trait: "#2c4a37", forme: "M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0" },
  { cle: "12", fond: "#c6d6c9", trait: "#2c4a37", forme: "M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0" },
  { cle: "13", fond: "#c6d6c9", trait: "#2c4a37", forme: "M13 33c4-12 8-16 11-16s7 4 11 16" },
  { cle: "21", fond: "#cfd3e2", trait: "#2f3a5b", forme: "M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0" },
  { cle: "22", fond: "#cfd3e2", trait: "#2f3a5b", forme: "M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0" },
  { cle: "31", fond: "#e0cdc4", trait: "#6b3f2f", forme: "M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0" },
  { cle: "32", fond: "#e0cdc4", trait: "#6b3f2f", forme: "M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0" },
  { cle: "41", fond: "#cddbe0", trait: "#2b4753", forme: "M24 13a11 11 0 1 0 .01 0M24 19a5 5 0 1 0 .01 0" },
  { cle: "42", fond: "#cddbe0", trait: "#2b4753", forme: "M13 21q5.5-8 11 0t11 0M13 29q5.5-8 11 0t11 0" },
] as const

/** `avatar:07` → le dessin, ou rien si la clé est inconnue. */
export function avatarDe(valeur: string | null | undefined): Avatar | null {
  if (!valeur?.startsWith("avatar:")) return null
  const cle = valeur.slice("avatar:".length)
  return AVATARS.find((a) => a.cle === cle) ?? null
}

/** Vrai pour une vraie image, fausse pour un avatar ou rien. */
export function estUnePhoto(valeur: string | null | undefined): boolean {
  return Boolean(valeur) && !valeur!.startsWith("avatar:")
}
