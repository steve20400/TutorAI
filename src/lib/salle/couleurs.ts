/**
 * Qui a écrit quoi, et de quelle couleur cela se dessine.
 *
 * ── POURQUOI LE DOCUMENT GARDE UN RÔLE, PAS UNE COULEUR ──
 *
 * Première tentative : chaque trait portait sa couleur, `#c9a227` ou
 * `#1f6b45`. Deux ennuis, et le second est le pire.
 *
 * Une toile ne comprend pas `var(--salle-eleve)` : `ctx.strokeStyle` attend
 * une couleur, pas un nom de variable, et une variable passée là ne peint
 * rien du tout — silencieusement. Le thème clair de la salle aurait donc
 * effacé tous les traits sans un message.
 *
 * Et une couleur figée dans le document est une couleur pour toujours. Un
 * cahier écrit en salle sombre, relu six mois plus tard en salle claire,
 * garderait des traits pensés pour un fond noir : illisibles sur du blanc. Or
 * ce cahier est fait pour être relu — c'est la moitié de ce qu'on vend au
 * parent.
 *
 * Le document garde donc QUI a écrit. La couleur se décide au moment de
 * peindre, d'après le thème du moment.
 */

export type Role = "rep" | "ele"

/** Pour le DOM : une variable CSS suffit, le navigateur la résout. */
export function varDe(role: Role): string {
  return role === "rep" ? "var(--salle-repetiteur)" : "var(--salle-eleve)"
}

/**
 * Pour une toile : il faut la valeur, pas son nom.
 *
 * Lue sur l'élément plutôt que sur la racine : une salle posée dans un
 * conteneur qui redéfinirait ces jetons — un aperçu, une impression — doit
 * suivre ce conteneur.
 *
 * Le repli n'est pas décoratif : `getPropertyValue` rend une chaîne vide si
 * la feuille de style n'est pas encore là, et une chaîne vide passée à
 * `strokeStyle` laisse la couleur précédente. On dessinerait alors le trait
 * de l'élève dans la couleur du répétiteur.
 */
export function couleurDe(role: Role, hote: Element | null): string {
  const cible = hote ?? document.documentElement
  const nom = role === "rep" ? "--salle-repetiteur" : "--salle-eleve"
  const lue = getComputedStyle(cible).getPropertyValue(nom).trim()
  if (lue) return lue
  return role === "rep" ? "#c9a227" : "#1b6b45"
}

/** Les couleurs du plan : quadrillage et axes, selon le thème du moment. */
export function jetonDe(nom: string, hote: Element | null, repli: string): string {
  const cible = hote ?? document.documentElement
  return getComputedStyle(cible).getPropertyValue(nom).trim() || repli
}
