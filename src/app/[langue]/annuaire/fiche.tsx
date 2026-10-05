import { pluriel, remplir, type Dictionnaire, type Langue } from "@/langues"

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
  verifie_le?: string | null
}

const INSECABLE = " "

/**
 * « 28000 » devient « 28 000 F », avec des espaces insécables.
 *
 * Un tarif coupé en fin de ligne — « 28 » ici, « 000 F » dessous — se lit une
 * seconde comme deux nombres. Sur un téléphone de 390 points, la ligne se
 * casse souvent là.
 */
export function francs(montant: number): string {
  const chiffres = montant.toLocaleString("fr-FR").replace(/\s/gu, INSECABLE)
  return `${chiffres}${INSECABLE}F`
}

export function initiales(prenom: string | null, nom: string | null): string {
  const l = [prenom, nom]
    .filter(Boolean)
    .map((m) => (m as string).trim()[0])
    .filter(Boolean)
    .join("")
  return l.toUpperCase() || "?"
}

/**
 * La fiche d'un répétiteur dans l'annuaire.
 *
 * Les deux tailles viennent du canevas : `AnnuaireTel` pour le téléphone,
 * `Main` pour le grand écran, où la photo passe de 104×112 à 206×168, le nom
 * de 15,5 à 21 px, et le tarif remonte flotter à droite.
 *
 * Les mesures qui ne se laissent pas écrire en classes — la découpe en biais,
 * le contour que le texte épouse, le dégradé de masque — vivent dans
 * `globals.css`, où une requête de média peut les changer d'un bord à l'autre.
 *
 * La ligne verte dit « Dossier contrôlé » quand on ne connaît pas le détail,
 * et la date du contrôle quand on la connaît. Elle ne nomme jamais des pièces
 * qu'on n'a pas lues : c'est la seule phrase qui porte la promesse du produit.
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

  const niveaux =
    r.niveaux.length > 1
      ? `${r.niveaux[0]} – ${r.niveaux[r.niveaux.length - 1]}`
      : (r.niveaux[0] ?? null)

  const meta = [
    r.matieres.length > 0 ? r.matieres.join(", ") : null,
    niveaux,
    r.annees_experience ? pluriel(langue, r.annees_experience, t.ans) : null,
    r.ville,
  ].filter(Boolean)

  const controle = r.verifie_le
    ? remplir(t.verifieLe, {
        date: new Date(r.verifie_le).toLocaleDateString(
          langue === "fr" ? "fr-FR" : "en-GB",
          { day: "numeric", month: "long" },
        ),
      })
    : t.verifie

  return (
    <article className="fiche mb-2.5 lg:mb-3.5">
      <span aria-hidden className="fiche-trait" />

      <div className="fiche-photo">
        {r.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photo_url} alt="" />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--voyant) 22%, var(--fond))" }}
          >
            <span
              className="text-[35px] font-medium lg:text-[56px]"
              style={{ marginRight: "18%", color: "var(--texte)" }}
            >
              {initiales(r.prenom, r.nom)}
            </span>
          </div>
        )}
      </div>

      {/* Le tarif ne flotte à droite que sur grand écran : sur un téléphone,
          il passerait par-dessus le nom. */}
      {r.tarif_mensuel ? (
        <div className="float-right ml-4 hidden text-right lg:block">
          <p className="m-0 text-[19px] font-medium tracking-[-0.015em]">
            {francs(r.tarif_mensuel)}
          </p>
          <p className="doux m-0 mt-0.5 text-[12px]">{t.parMoisCourt}</p>
        </div>
      ) : null}

      <h3 className="m-0 text-[15.5px] font-medium tracking-[-0.01em] lg:text-[21px] lg:tracking-[-0.018em]">
        {nomComplet}
      </h3>

      <p
        className="mt-[3px] flex items-center gap-[5px] text-[11px] lg:mt-[5px] lg:gap-1.5 lg:text-[12.5px]"
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
          className="block shrink-0 lg:h-[14px] lg:w-[14px]"
        >
          <path d="m4 12.5 5 5L20 6.5" />
        </svg>
        <span>{controle}</span>
      </p>

      {r.bio ? (
        <p className="mt-2 text-[12.5px] leading-relaxed lg:mt-3 lg:text-[14.5px] lg:leading-[1.72]">
          &laquo;&nbsp;{r.bio}&nbsp;&raquo;
        </p>
      ) : null}

      <p className="doux mt-2 text-[11.5px] lg:mt-[11px] lg:text-[12.5px]">
        {meta.join(" · ")}
        {/* Sur téléphone, le tarif revient dans cette ligne. */}
        {r.tarif_mensuel ? (
          <span className="lg:hidden">
            {meta.length > 0 ? " · " : ""}
            <strong className="font-medium" style={{ color: "var(--texte)" }}>
              {francs(r.tarif_mensuel)}
            </strong>
            {t.parMois}
          </span>
        ) : null}
      </p>

      <div className="clear-both" />
    </article>
  )
}
