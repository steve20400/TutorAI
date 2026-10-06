/**
 * Les listes fermées que l'annuaire filtre et que le répétiteur renseigne.
 *
 * Ce sont les valeurs STOCKÉES en base — jamais leurs étiquettes. Elles
 * voyagent dans l'adresse (`?langueCours=en`), et c'est la raison d'être de ce
 * fichier : si l'écran y mettait « En anglais », un lien partagé cesserait de
 * filtrer dès qu'on change de langue.
 *
 * Les mêmes listes sont contrôlées par la base (migration 071) et par le
 * service. Ici elles ne protègent rien : elles disent seulement quelles cases
 * dessiner, et dans quel ordre.
 *
 * Dans `lib/` et non dans l'annuaire : le formulaire du répétiteur s'en sert
 * aussi, et une page n'importe pas une autre page.
 */
export const LANGUES_COURS = ["fr", "en"] as const

/**
 * Quatre moments, et pas quatorze.
 *
 * Une famille ne cherche pas « mardi 17 h », elle cherche « quelqu'un qui peut
 * après l'école » ou « quelqu'un qui peut le week-end ». Un découpage plus fin
 * donnerait une grille que personne ne remplirait honnêtement, et des filtres
 * qui écartent à tort.
 */
export const MOMENTS = [
  "semaine_apres_ecole",
  "semaine_soir",
  "samedi",
  "dimanche",
] as const
