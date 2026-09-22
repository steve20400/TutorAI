/**
 * Listes fermées du référentiel scolaire camerounais.
 *
 * Dans un fichier ordinaire et non dans `actions/repetiteur.ts`, qui porte
 * `"use server"` : là-bas, seules les fonctions async traversent la frontière
 * vers le navigateur. Une constante exportée d'un fichier serveur arrive
 * `undefined` côté client — et `[...undefined]` lève « u is not iterable ».
 *
 * Ce n'est pas une erreur que la compilation attrape : le type reste correct,
 * et le crash n'apparaît qu'à l'exécution, sur la page de profil du
 * répétiteur, c'est-à-dire sur le premier écran qu'il voit en se connectant.
 *
 * Les deux listes servent aux deux bords : le formulaire les affiche, l'action
 * serveur filtre contre elles ce qui remonte du navigateur.
 */
export const MATIERES = [
  "Mathématiques",
  "Physique-Chimie",
  "SVT",
  "Français",
  "Anglais",
  "Philosophie",
  "Histoire-Géographie",
  "Informatique",
  "Économie",
] as const

export const NIVEAUX = [
  "6e",
  "5e",
  "4e",
  "3e",
  "2nde",
  "1ère",
  "Terminale",
] as const

export type Matiere = (typeof MATIERES)[number]
export type Niveau = (typeof NIVEAUX)[number]
