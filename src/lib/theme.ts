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
