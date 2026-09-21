/**
 * Applique un registre visuel à tout un espace de l'application.
 *
 * Les variables CSS sont redéfinies sur ce conteneur, donc tout ce qu'il
 * contient en hérite. Il peint aussi le fond par-dessus celui du <body>, sans
 * quoi l'espace adulte garderait le fond crème de l'espace élève.
 *
 * Voir src/app/globals.css pour les deux palettes.
 */
export function Registre({
  type,
  children,
}: {
  type: "eleve" | "adulte"
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
