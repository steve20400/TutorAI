import { api } from "./api"

/**
 * Le référentiel scolaire camerounais : matières et niveaux.
 *
 * Il était écrit en dur ici, et une deuxième fois dans le service, pour la
 * validation. Deux listes qui disent la même chose finissent toujours par
 * diverger — et le jour où elles divergent, personne ne le voit. C'est
 * exactement ainsi que la clé Gemini a disparu en silence.
 *
 * Ce sont des données, pas du code : le système scolaire bouge, une matière
 * s'ajoute, un intitulé change. Rien de cela ne doit demander un déploiement.
 *
 * Attention au piège que portait l'ancien fichier, et qui vaut toujours : le
 * formulaire du répétiteur est un composant CLIENT. Il ne peut pas appeler
 * ceci. C'est la page, servie, qui lit le référentiel et le lui passe en
 * propriété.
 */
export type Referentiel = {
  matieres: string[]
  niveaux: string[]
}

/**
 * En cas de panne, deux listes vides plutôt qu'une page en erreur.
 *
 * Un répétiteur verrait alors un formulaire sans cases à cocher — ce qui est
 * visiblement anormal, donc signalable — au lieu d'un écran blanc dont il ne
 * pourrait rien dire.
 */
export async function lireReferentiel(): Promise<Referentiel> {
  try {
    const r = await api<Referentiel>("/v1/referentiel", { sansSession: true })
    return { matieres: r.matieres ?? [], niveaux: r.niveaux ?? [] }
  } catch {
    return { matieres: [], niveaux: [] }
  }
}
