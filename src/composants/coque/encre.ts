/**
 * L'encre de la barre d'application, et les deux textes qui s'y posent.
 *
 * Elle ne suit pas le thème, volontairement. C'est la même règle que pour la
 * barre latérale de l'administration et pour le bandeau du dossier : du texte
 * clair est posé sur un aplat sombre, et un aplat qui s'éclaircirait en thème
 * sombre rendrait ce texte illisible. Le contraste tient contre l'aplat, pas
 * contre le thème.
 *
 * Dans un fichier à part parce que la barre, le champ de recherche et le
 * choix de ville s'en servent tous les trois, et qu'un des trois importe les
 * deux autres : les laisser dans le composant aurait fait un cercle.
 */
export const ENCRE = "#14203a"
export const ENCRE_TEXTE = "#eef1f7"
export const ENCRE_DOUX = "#9fb0cc"
