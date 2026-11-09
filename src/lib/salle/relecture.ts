/**
 * Rejouer une séance : quoi montrer, à quel instant.
 *
 * ── POURQUOI UNE LECTURE EN AVANT SEULEMENT ──
 *
 * Yjs sait appliquer une mise à jour, il ne sait pas la retirer. C'est le
 * prix d'un CRDT, et c'est aussi ce qui fait sa solidité : l'histoire ne se
 * défait pas.
 *
 * Reculer dans la séance ne consiste donc pas à « revenir en arrière » mais à
 * repartir d'un document vide et à rejouer jusqu'au point voulu. Ça paraît
 * coûteux ; ça ne l'est pas. Appliquer quelques milliers de mises à jour
 * binaires prend quelques dizaines de millisecondes — moins de temps qu'il
 * n'en faut pour relâcher la souris.
 *
 * ── ET POURQUOI LA POSITION, PAS L'HORLOGE ──
 *
 * Chaque geste porte sa position dans la séance, en millisecondes depuis son
 * ouverture. On ne rejoue donc pas « le mardi 9 à 14 h 12 » mais « à la
 * douzième minute » — et les deux pistes, celle du répétiteur et celle de
 * l'élève, se recalent l'une sur l'autre sans jamais dépendre de l'accord de
 * deux horloges qui ne l'ont jamais été.
 */

/** Un geste de la trace, réduit à ce dont la relecture a besoin. */
export type Geste = { t: number }

/**
 * Les indices des gestes à appliquer pour passer de `depuis` à `jusqua`.
 *
 * Bornes ouvertes à gauche, fermées à droite : un geste exactement à la
 * position courante a déjà été appliqué. Sans cette asymétrie, le premier
 * geste d'une séance serait appliqué deux fois au démarrage.
 */
export function fenetre(
  gestes: readonly Geste[],
  depuis: number,
  jusqua: number,
): number[] {
  const indices: number[] = []
  for (let i = 0; i < gestes.length; i++) {
    const t = gestes[i]?.t ?? 0
    if (t > jusqua) break
    if (t > depuis) indices.push(i)
  }
  return indices
}

/**
 * Faut-il tout reconstruire ?
 *
 * Dès qu'on recule, oui — voir l'en-tête. On ne peut pas retirer une mise à
 * jour d'un document Yjs.
 */
export function faudraitReconstruire(de: number, vers: number): boolean {
  return vers < de
}

/** La durée de la séance : la position du dernier geste. */
export function dureeTotale(gestes: readonly Geste[]): number {
  return gestes.length === 0 ? 0 : (gestes[gestes.length - 1]?.t ?? 0)
}

/**
 * Où l'on se trouve après `ecoule` millisecondes de lecture.
 *
 * Bornée à la durée : une séance ne continue pas après sa fin, et une
 * position qui dépasse ferait glisser la barre hors de son rail.
 */
export function avancer(
  position: number,
  ecoule: number,
  vitesse: number,
  duree: number,
): number {
  return Math.min(duree, Math.max(0, position + ecoule * vitesse))
}

/**
 * « 12:34 », ou « 1:02:03 » au-delà de l'heure.
 *
 * L'heure n'apparaît que lorsqu'elle existe : « 0:12:34 » pour une séance de
 * douze minutes se lit moins vite, et une barre de lecture se lit du coin de
 * l'œil.
 */
export function enHorloge(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const deux = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${String(h)}:${deux(m)}:${deux(s)}` : `${String(m)}:${deux(s)}`
}

/**
 * Les vitesses offertes.
 *
 * Jusqu'à quatre fois : une séance d'une heure se survole en quinze minutes,
 * ce qui est le geste réel de quelqu'un qui cherche un passage. Et une demie,
 * parce qu'un trait tracé vite se relit lentement.
 */
export const VITESSES = [0.5, 1, 2, 4] as const
