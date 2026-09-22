/**
 * Avatar : la photo si elle existe, les initiales sinon.
 *
 * Jamais une silhouette grise anonyme. Sur un produit où des parents confient
 * leur enfant à un adulte, une pastille sans visage et sans nom est le
 * contraire de ce qu'on veut donner à voir — les initiales, au moins, sont
 * quelqu'un.
 *
 * La couleur de fond est tirée du nom, donc stable : la même personne garde sa
 * teinte d'un écran à l'autre, et deux homonymes ne se confondent pas.
 */

/** Teintes sourdes, lisibles avec du texte foncé dans les deux thèmes. */
const TEINTES = [
  "#d9c9a8",
  "#c6d6c9",
  "#cfd3e2",
  "#e0cdc4",
  "#cddbe0",
  "#dbd0dd",
] as const

export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? "")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 0 && /\p{L}/u.test(m[0]!))

  if (mots.length === 0) return "?"
  if (mots.length === 1) return mots[0]!.slice(0, 2).toUpperCase()
  return (mots[0]![0]! + mots[mots.length - 1]![0]!).toUpperCase()
}

/** Somme des points de code : suffisant pour répartir, et stable partout. */
function teinteDe(nom: string): string {
  let somme = 0
  for (const c of nom) somme += c.codePointAt(0) ?? 0
  return TEINTES[somme % TEINTES.length]!
}

export function Avatar({
  nom,
  photoUrl,
  taille = 32,
  className,
}: {
  nom: string | null | undefined
  photoUrl?: string | null
  taille?: number
  className?: string
}) {
  const libelle = (nom ?? "").trim()

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={libelle}
        width={taille}
        height={taille}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
        style={{ width: taille, height: taille }}
      />
    )
  }

  return (
    <span
      aria-hidden
      title={libelle || undefined}
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${className ?? ""}`}
      style={{
        width: taille,
        height: taille,
        background: teinteDe(libelle || "?"),
        // Encre fixe et non var(--texte) : la teinte de fond est claire dans
        // les deux thèmes, du texte clair dessus serait illisible en sombre.
        color: "#22304a",
        fontSize: Math.round(taille * 0.38),
        letterSpacing: "0.02em",
      }}
    >
      {initiales(libelle)}
    </span>
  )
}
