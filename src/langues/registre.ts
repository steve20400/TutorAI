import { type Dictionnaire } from "."

/**
 * Qui parle à qui.
 *
 * Le tuteur IA sert un enfant de sixième et un étudiant majeur. Les écrans
 * sont les mêmes ; les phrases, non — et pas seulement à cause du tutoiement.
 * L'écran d'un enfant dit « Préviens un adulte » et « Demande à un adulte de
 * ta famille de recharger ton compte ». À quelqu'un qui EST l'adulte et qui
 * paie, cela ne veut rien dire.
 *
 * On fusionne donc un bloc d'écart par-dessus le bloc de base, plutôt que de
 * tenir deux dictionnaires complets : soixante phrases recopiées finiraient
 * par diverger, et c'est la copie oubliée qui tutoierait un adulte.
 */
export function registreTuteur(
  d: Dictionnaire,
  adulte: boolean,
): Dictionnaire["tuteur"] {
  if (!adulte) return d.tuteur
  return {
    ...d.tuteur,
    ...d.tuteurAdulte,
    // L'objet imbriqué ne se fusionne pas tout seul : sans cette ligne, les
    // quatre messages d'indisponibilité repasseraient au tutoiement.
    tuteurIndisponible: {
      ...d.tuteur.tuteurIndisponible,
      ...d.tuteurAdulte.tuteurIndisponible,
    },
  }
}

/** La jauge de jetons, au bon registre. */
export function registreJauge(
  d: Dictionnaire,
  adulte: boolean,
): Dictionnaire["jaugeEleve"] {
  return adulte ? { ...d.jaugeEleve, ...d.jaugeAdulte } : d.jaugeEleve
}
