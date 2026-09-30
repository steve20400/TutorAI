import { pluriel, type Dictionnaire, type Langue } from "@/langues"

export type Repetiteur = {
  id: string
  prenom: string | null
  nom: string | null
  photo_url: string | null
  bio: string | null
  ville: string | null
  matieres: string[]
  niveaux: string[]
  tarif_mensuel: number | null
  annees_experience: number | null
  disponibilites_texte: string | null
}

/**
 * « 28000 » devient « 28 000 F », avec des espaces insécables.
 *
 * Un tarif coupé en fin de ligne — « 28 » ici, « 000 F » dessous — se lit
 * une seconde comme deux nombres. Sur un téléphone de 390 points, la ligne
 * se casse souvent là.
 *
 * La constante plutôt que le caractère : un espace insécable écrit tel quel
 * dans le source est invisible à la relecture, et le linter le refuse avec
 * raison.
 */
const INSECABLE = "\u00a0"

function francs(montant: number): string {
  // `\s` couvre aussi l'espace fine que `toLocaleString` pose en français.
  const chiffres = montant.toLocaleString("fr-FR").replace(/\s/gu, INSECABLE)
  return `${chiffres}${INSECABLE}F`
}

function initiales(prenom: string | null, nom: string | null): string {
  const lettres = [prenom, nom]
    .filter(Boolean)
    .map((m) => (m as string).trim()[0])
    .filter(Boolean)
    .join("")
  return lettres.toUpperCase() || "?"
}

/**
 * La fiche d'un répétiteur dans l'annuaire.
 *
 * Reprise du canevas « Annuaire · téléphone » : la photo flotte à gauche,
 * taillée en biais, et le texte l'épouse — `shape-outside` fait le contour,
 * `clip-path` la découpe, et le dégradé de masque la fait mourir dans le fond
 * au lieu de s'arrêter net. Les trois vont ensemble : retirer l'un donne un
 * rectangle posé sur une carte.
 *
 * Le trait vert à gauche et la ligne « Identité, casier, diplôme » disent la
 * même chose deux fois, et c'est voulu : c'est la seule promesse du produit
 * qu'un parent doit lire sans la chercher.
 *
 * Les couleurs viennent des variables du thème et non du dessin : le canevas
 * est en clair, l'application a quatre combinaisons.
 */
export function Fiche({
  r,
  langue,
  d,
}: {
  r: Repetiteur
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.annuaire
  const nomComplet = [r.prenom, r.nom].filter(Boolean).join(" ")

  const meta = [
    r.matieres.length > 0 ? r.matieres.join(", ") : null,
    r.annees_experience
      ? pluriel(langue, r.annees_experience, t.ans)
      : null,
  ].filter(Boolean)

  return (
    <article
      className="relative mb-2.5 overflow-hidden rounded-[11px] py-3 pl-0 pr-3.5"
      style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
    >
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: "var(--accent-doux-texte)" }}
      />

      <div
        className="relative float-left ml-2.5 mr-[11px] h-28 w-26 overflow-hidden rounded-[9px]"
        style={{
          width: 104,
          height: 112,
          shapeOutside: "polygon(0 0,100% 0,72% 100%,0 100%)",
          shapeMargin: 8,
          clipPath: "polygon(0 0,100% 0,72% 100%,0 100%)",
        }}
      >
        {r.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.photo_url}
            alt=""
            className="block h-full w-full object-cover"
            style={{
              objectPosition: "center 20%",
              maskImage:
                "linear-gradient(101deg,#000 40%,rgba(0,0,0,.34) 79%,transparent 97%)",
              WebkitMaskImage:
                "linear-gradient(101deg,#000 40%,rgba(0,0,0,.34) 79%,transparent 97%)",
            }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--voyant) 22%, var(--fond))",
              maskImage:
                "linear-gradient(101deg,#000 40%,rgba(0,0,0,.34) 79%,transparent 97%)",
              WebkitMaskImage:
                "linear-gradient(101deg,#000 40%,rgba(0,0,0,.34) 79%,transparent 97%)",
            }}
          >
            <span
              className="text-[35px] font-medium"
              style={{ marginRight: "18%", color: "var(--texte)" }}
            >
              {initiales(r.prenom, r.nom)}
            </span>
          </div>
        )}
      </div>

      <h3 className="m-0 text-[15.5px] font-medium tracking-[-0.01em]">
        {nomComplet}
      </h3>

      <p
        className="mt-[3px] flex items-center gap-[5px] text-[11px]"
        style={{ color: "var(--accent-doux-texte)" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="block shrink-0"
        >
          <path d="m4 12.5 5 5L20 6.5" />
        </svg>
        <span>{t.verifie}</span>
      </p>

      {r.bio ? (
        <p className="mt-2 text-[12.5px] leading-relaxed">
          &laquo;&nbsp;{r.bio}&nbsp;&raquo;
        </p>
      ) : null}

      <p className="mt-2 text-[11.5px]" style={{ color: "var(--texte-doux)" }}>
        {meta.join(" · ")}
        {meta.length > 0 ? " · " : ""}
        {r.tarif_mensuel ? (
          <>
            <strong className="font-medium" style={{ color: "var(--texte)" }}>
              {francs(r.tarif_mensuel)}
            </strong>
            {t.parMois}
          </>
        ) : (
          t.sansTarif
        )}
      </p>

      <div className="clear-both" />
    </article>
  )
}
