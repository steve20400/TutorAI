/**
 * La marque : un écran sur pied, le répétiteur en grand, l'élève dans la
 * vignette, et le voyant d'enregistrement allumé.
 *
 * Trois choix arrêtés au moment du dessin, qu'il vaut mieux connaître avant de
 * les défaire :
 *
 * — Deux cadres et non un seul. Deux personnes côte à côte dans un même cadre,
 *   à taille égale, se lisent comme un couple : la première version du logo
 *   évoquait une application de rencontre. La vignette dit la distance.
 * — Une vraie différence d'échelle entre l'adulte et l'enfant. C'est elle qui
 *   fait comprendre qu'il s'agit d'un cours, pas d'une conversation.
 * — Le voyant en rouge franc dans les quatre thèmes. C'est le seul élément qui
 *   annonce la surveillance ; ambré sur fond crème, il disparaissait.
 *
 * La réserve utilise var(--fond) : la marque se pose donc sur le fond de la
 * page, jamais sur une carte d'une autre couleur.
 */
export function Marque({
  taille = 40,
  anime = false,
  className,
}: {
  taille?: number
  /** Joue la mise en place : l'adulte, puis la vignette, puis le voyant. */
  anime?: boolean
  className?: string
}) {
  const adulte = anime
    ? { animation: "chargement-apparait .4s ease-out .18s both" }
    : undefined
  const vignette = anime
    ? {
        animation:
          "chargement-vignette .45s cubic-bezier(.34,1.45,.5,1) .48s both",
        transformBox: "view-box" as const,
        transformOrigin: "34px 27px",
      }
    : undefined
  const voyant = anime
    ? { animation: "chargement-voyant 1.15s linear .76s both" }
    : undefined

  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="3" y="5" width="42" height="31" rx="7" fill="currentColor" />
      <rect x="20" y="36" width="8" height="4" fill="currentColor" />
      <rect x="13" y="39.5" width="22" height="4.6" rx="2.3" fill="currentColor" />

      <g style={adulte} className={anime ? "chargement-anime" : undefined}>
        <circle cx="16.5" cy="15" r="4.7" fill="var(--fond)" />
        <path d="M8.2 28.8 a8.3 8.8 0 0 1 16.6 0 z" fill="var(--fond)" />
      </g>

      <g style={vignette} className={anime ? "chargement-anime" : undefined}>
        <rect
          x="26.5"
          y="20.5"
          width="15.5"
          height="12.5"
          rx="3.5"
          fill="var(--fond)"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="34.25" cy="25.4" r="2.4" fill="currentColor" />
        <path d="M30.6 33 a3.65 3.9 0 0 1 7.3 0 z" fill="currentColor" />
      </g>

      <circle
        cx="39.5"
        cy="11"
        r="3"
        fill="var(--voyant)"
        style={voyant}
        className={anime ? "chargement-anime" : undefined}
      />
    </svg>
  )
}

/** La marque et le nom, tels qu'ils apparaissent en tête de page. */
export function Logo({
  taille = 26,
  className,
}: {
  taille?: number
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Marque taille={taille} />
      <span
        className="font-bold"
        style={{ letterSpacing: "0.11em", fontSize: taille * 0.62 }}
      >
        TUTELA
      </span>
    </span>
  )
}
