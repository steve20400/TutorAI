/**
 * Conteneur pleine hauteur qui peint le fond du thème.
 *
 * Historiquement, ce composant portait deux palettes — une pour l'espace
 * élève, une pour l'espace adulte. Ce n'est plus le cas : depuis les quatre
 * thèmes, c'est l'utilisateur qui choisit son registre visuel dans les
 * réglages, et il s'applique à toute l'application.
 *
 * La propriété `type` ne change donc plus aucune couleur. Elle est conservée
 * le temps que les pages d'authentification soient refaites, pour ne pas
 * modifier quatre fichiers avant de les réécrire — mais elle est à retirer à
 * ce moment-là. Voir src/lib/theme.ts et src/app/globals.css.
 */
export function Registre({
  type,
  children,
}: {
  /** @deprecated Sans effet. Le registre visuel vient du thème choisi. */
  type?: "eleve" | "adulte"
  children: React.ReactNode
}) {
  return (
    <div
      data-registre={type}
      className="min-h-dvh"
      style={{ background: "var(--fond)", color: "var(--texte)" }}
    >
      {children}
    </div>
  )
}
