/** Thèmes et modes proposés, et le script qui les applique avant le rendu. */

export const THEMES = [
  { cle: "indigo", nom: "Indigo" },
  { cle: "foret", nom: "Forêt" },
] as const

export const MODES = [
  { cle: "systeme", nom: "Système" },
  { cle: "clair", nom: "Clair" },
  { cle: "sombre", nom: "Sombre" },
] as const

export type Theme = (typeof THEMES)[number]["cle"]
export type Mode = (typeof MODES)[number]["cle"]

export const CLE_THEME = "tutela-theme"
export const CLE_MODE = "tutela-mode"

/**
 * Posé dans <head>, avant tout rendu.
 *
 * Sans lui, la page s'affiche une fraction de seconde dans le thème par défaut
 * puis bascule : un éclair clair au lancement, chaque fois, pour quelqu'un qui
 * a choisi le mode sombre. Il doit rester synchrone et minuscule.
 *
 * Les valeurs lues sont comparées à une liste fermée : le stockage local est
 * modifiable par l'utilisateur, on n'y injecte rien sans vérifier.
 */
export const SCRIPT_THEME = `(function(){try{var d=document.documentElement,t=localStorage.getItem(${JSON.stringify(
  CLE_THEME,
)}),m=localStorage.getItem(${JSON.stringify(
  CLE_MODE,
)});if(t==="indigo"||t==="foret")d.setAttribute("data-theme",t);if(m==="clair"||m==="sombre")d.setAttribute("data-mode",m);}catch(e){}})()`

/**
 * Clé de l'écran de chargement, partagée avec le composant.
 *
 * `sessionStorage` et non `localStorage` : l'animation doit revenir à la
 * prochaine ouverture de l'application, pas disparaître pour toujours.
 */
export const CLE_CHARGEMENT = "tutela-chargement-joue"

/**
 * Posé dans <head>, avant tout rendu, juste après le script du thème.
 *
 * Le composant `EcranChargement` sait déjà qu'il ne doit pas se rejouer, mais
 * il l'apprend dans un `useEffect` — c'est-à-dire APRÈS un premier rendu. Or
 * changer de langue démonte le layout de `[langue]` et le remonte : l'écran
 * réapparaissait donc le temps d'une image, animation comprise, ce qui se lit
 * comme un rechargement complet de l'application alors qu'on voulait
 * seulement relire la même page dans l'autre langue.
 *
 * Décider ici, avant que le corps de la page ne soit peint, supprime cette
 * image. Même mécanisme que pour le thème, et pour la même raison.
 */
export const SCRIPT_CHARGEMENT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(
  CLE_CHARGEMENT,
)})==="1")document.documentElement.setAttribute("data-chargement","joue")}catch(e){}})()`
