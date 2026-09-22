export type Ville = { nom: string; x: number; y: number }

/**
 * La couverture du pays, vue d'en haut.
 *
 * C'est la pièce du tableau de bord : elle répond d'un coup d'œil à la seule
 * question que l'administration se pose le matin — où manque-t-il quelqu'un.
 * Des barres triées par volume répondaient à une autre question, « qui est le
 * plus fourni », qui n'appelle aucune décision.
 *
 * Une ville sans répétiteur garde son point, en creux. C'est le vide qui
 * informe, pas le plein — mais seulement pour les villes que l'administration
 * a réellement ouvertes : les villes viennent de la table `villes`, jamais
 * d'une liste écrite dans ce fichier, sinon la carte afficherait des lieux que
 * la base ne connaît pas.
 */
export function CarteCouverture({
  villes,
  parVille,
  legendeVide,
}: {
  villes: readonly Ville[]
  /** Nombre de répétiteurs vérifiés, par nom de ville. */
  parVille: Map<string, number>
  /** Affiché quand aucune des villes ouvertes n'a encore de répétiteur. */
  legendeVide: string
}) {
  const maximum = Math.max(1, ...villes.map((v) => parVille.get(v.nom) ?? 0))
  const total = villes.reduce((n, v) => n + (parVille.get(v.nom) ?? 0), 0)

  return (
    <div
      className="relative overflow-hidden rounded-[9px]"
      style={{ border: "1px solid var(--bordure)" }}
    >
      <svg
        viewBox="0 0 300 230"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
        role="img"
        aria-label={legendeVide}
      >
        <rect width="300" height="230" fill="var(--carte-fond)" />
        <path
          d="M0 0h118l14 22-9 30 16 20 6 34-9 26 20 18-4 44 26 36H0z"
          fill="var(--carte-terre)"
        />
        <path
          d="M300 0v58l-26 8-18 30 8 36-22 26 10 30-14 42h62z"
          fill="var(--carte-terre)"
        />
        <path
          d="M0 178c34-6 58 4 76 22 10 10 14 20 16 30H0z"
          fill="var(--carte-eau)"
        />
        <path
          d="M236 0c-10 26-4 44 6 58 12 16 30 20 58 18"
          fill="none"
          stroke="var(--carte-eau)"
          strokeWidth="5"
        />

        <g stroke="var(--carte-route)" fill="none" strokeLinecap="round">
          <path d="M-4 120 L84 108 L152 130 L228 116 L306 128" strokeWidth="4.5" />
          <path d="M96 -4 L106 62 L84 108 L92 166 L58 216" strokeWidth="4" />
          <path d="M152 130 L176 190 L150 234" strokeWidth="3" />
          <path d="M228 116 L258 62 L246 -4" strokeWidth="3" />
        </g>

        <g stroke="var(--carte-grille)" fill="none" strokeWidth="1.3">
          <path d="M0 40h300M0 80h300M0 160h300M0 200h300M40 0v230M120 0v230M200 0v230M260 0v230" />
        </g>

        {villes.map((v) => {
          const n = parVille.get(v.nom) ?? 0
          // Le rayon suit la racine du nombre : l'aire du disque reste alors
          // proportionnelle au volume, ce que l'œil lit correctement.
          const rayon = n === 0 ? 4.5 : 7 + 10 * Math.sqrt(n / maximum)

          return (
            <g key={v.nom}>
              {n > 0 ? (
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={rayon + 9}
                  fill="var(--carte-pastille)"
                  opacity="0.15"
                />
              ) : null}
              <circle
                cx={v.x}
                cy={v.y}
                r={rayon}
                fill={n === 0 ? "none" : "var(--carte-pastille)"}
                stroke="var(--carte-pastille)"
                strokeWidth={n === 0 ? 1.6 : 0}
                strokeDasharray={n === 0 ? "2.6 2.6" : undefined}
              />
              {n > 0 ? (
                <text
                  x={v.x}
                  y={v.y + 3.4}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="var(--carte-chiffre)"
                >
                  {n}
                </text>
              ) : null}
              <text
                x={v.x}
                y={v.y + rayon + 11}
                textAnchor="middle"
                fontSize="8.2"
                fill="var(--carte-nom)"
              >
                {v.nom}
              </text>
            </g>
          )
        })}
      </svg>

      {total === 0 ? (
        <div className="absolute inset-0 grid place-items-center">
          <p
            className="max-w-[230px] rounded-[8px] px-3 py-2 text-center text-[12px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--bordure)",
            }}
          >
            {legendeVide}
          </p>
        </div>
      ) : null}
    </div>
  )
}
