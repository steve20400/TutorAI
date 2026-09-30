import Link from "next/link"
import { notFound } from "next/navigation"

import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { api } from "@/lib/api"

type Fiche = {
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
  verifie_le: string | null
}

type Piece = {
  cle: string
  libelle_fr: string
  libelle_en: string
  examinee_le: string | null
}

/**
 * L'encre du bandeau ne suit pas le thème, et c'est volontaire.
 *
 * Le titre et la date y sont posés sur une photographie. Une encre qui
 * s'éclaircirait en thème sombre rendrait ce texte illisible sur les photos
 * claires — le contraste doit tenir contre l'image, pas contre le thème.
 * Même raison que pour le voyant rouge de la marque.
 */
const ENCRE = "#14203a"
const ENCRE_DOUX = "#9fb0cc"
const ENCRE_TEXTE = "#eef1f7"

const INSECABLE = " "

function francs(montant: number): string {
  return `${montant.toLocaleString("fr-FR").replace(/\s/gu, INSECABLE)}${INSECABLE}F`
}

function initiales(prenom: string | null, nom: string | null): string {
  const l = [prenom, nom]
    .filter(Boolean)
    .map((m) => (m as string).trim()[0])
    .filter(Boolean)
    .join("")
  return l.toUpperCase() || "?"
}

/** Un intitulé de section : petit, espacé, en capitales. */
function Titre({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[10.5px] uppercase tracking-[0.13em]"
      style={{ color: "var(--texte-doux)" }}
    >
      {children}
    </p>
  )
}

/**
 * Le dossier d'un répétiteur.
 *
 * Repris du canevas « Dossier · téléphone ». Son cœur est la section « ce qui
 * a été contrôlé » : l'annuaire affirme qu'un répétiteur est vérifié, le
 * dossier dit sur quoi et à quelle date. C'est la promesse entière du
 * produit, et elle ne vaut que pièce par pièce.
 *
 * Le dessin porte un « DOSSIER Nº 0047 ». Il n'y a pas de numéro de dossier
 * en base, et en fabriquer un serait inventer une donnée : l'étiquette reste,
 * le numéro non.
 *
 * Le dessin montre aussi une plage de niveaux par matière. La base garde les
 * matières et les niveaux séparément, sans les croiser — on affiche donc les
 * matières, puis la plage de niveaux une seule fois, plutôt que d'inventer
 * une correspondance que personne n'a saisie.
 */
export default async function PageDossier({
  params,
}: {
  params: Promise<{ langue: string; id: string }>
}) {
  const { langue: brut, id } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.annuaire.dossier

  let fiche: Fiche | null = null
  let pieces: Piece[] = []
  try {
    const r = await api<{ fiche: Fiche; pieces: Piece[] }>(
      `/v1/repetiteurs/${id}`,
      { sansSession: true },
    )
    fiche = r.fiche
    pieces = r.pieces ?? []
  } catch {
    fiche = null
  }

  if (!fiche) notFound()

  const nomComplet = [fiche.prenom, fiche.nom].filter(Boolean).join(" ")
  const dateLongue = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null

  const sousTitre = [
    fiche.verifie_le
      ? remplir(t.controleLe, { date: dateLongue(fiche.verifie_le) ?? "" })
      : null,
    fiche.ville,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      {/* Le bandeau : la photographie, le nom, et la date du contrôle. */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{ height: 360, background: ENCRE, color: ENCRE_TEXTE }}
      >
        {fiche.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fiche.photo_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: "center 14%",
              maskImage:
                "linear-gradient(166deg,#000 24%,rgba(0,0,0,.4) 64%,transparent 89%)",
              WebkitMaskImage:
                "linear-gradient(166deg,#000 24%,rgba(0,0,0,.4) 64%,transparent 89%)",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[86px] font-medium opacity-30">
              {initiales(fiche.prenom, fiche.nom)}
            </span>
          </div>
        )}

        <div className="absolute left-0 right-0 top-0 flex items-center p-3">
          <Link
            href={chemin(langue, "/annuaire")}
            aria-label={d.annuaire.retour}
            className="flex rounded-full p-[7px]"
            style={{ background: "rgb(20 32 58 / 0.55)", color: ENCRE_TEXTE }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="block shrink-0"
            >
              <path d="M14 7l-5 5 5 5" />
            </svg>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-3.5">
          <p
            className="m-0 text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: "var(--voyant)" }}
          >
            {t.etiquette}
          </p>
          <h1 className="mt-[7px] text-[27px] font-medium leading-[1.12] tracking-[-0.025em]">
            {nomComplet}
          </h1>
          {sousTitre ? (
            <p className="mt-1.5 text-[12.5px]" style={{ color: ENCRE_DOUX }}>
              {sousTitre}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-6 pt-4">
        {/* Ce qui a été contrôlé — le cœur du dossier. */}
        <Titre>{t.controle}</Titre>
        {pieces.length === 0 ? (
          <p className="doux mb-6 text-[12.5px] leading-relaxed">
            {t.controleAucun}
          </p>
        ) : (
          <div
            className="mb-6 rounded-[11px] px-3.5 py-1"
            style={{
              background: "var(--accent-doux)",
              color: "var(--accent-doux-texte)",
            }}
          >
            {pieces.map((p, i) => (
              <div
                key={p.cle}
                className="flex items-baseline justify-between py-[9px]"
                style={
                  i < pieces.length - 1
                    ? {
                        borderBottom:
                          "1px solid color-mix(in srgb, var(--accent-doux-texte) 22%, transparent)",
                      }
                    : undefined
                }
              >
                <span className="text-[12.5px]">
                  {langue === "fr" ? p.libelle_fr : p.libelle_en}
                </span>
                <span className="text-[11.5px]">
                  {dateLongue(p.examinee_le)}
                </span>
              </div>
            ))}
          </div>
        )}

        {fiche.bio ? (
          <>
            <Titre>{t.facon}</Titre>
            <div className="relative mb-6 pl-[30px]">
              <span
                aria-hidden
                className="absolute left-[-4px] top-[-16px] text-[56px] leading-none opacity-[0.14]"
              >
                &laquo;
              </span>
              <p className="m-0 whitespace-pre-line text-[13.5px] leading-[1.8]">
                {fiche.bio}
              </p>
            </div>
          </>
        ) : null}

        {fiche.matieres.length > 0 ? (
          <>
            <Titre>{t.enseigne}</Titre>
            <div className="mb-6">
              {fiche.matieres.map((m, i) => (
                <div
                  key={m}
                  className="py-[9px]"
                  style={
                    i < fiche.matieres.length - 1
                      ? { borderBottom: "1px solid var(--bordure)" }
                      : undefined
                  }
                >
                  <p className="m-0 text-[13.5px] font-medium">{m}</p>
                  {fiche.niveaux.length > 0 ? (
                    <p
                      className="mt-0.5 text-[12.5px]"
                      style={{ color: "var(--texte-doux)" }}
                    >
                      {remplir(t.niveauxDe, {
                        premier: fiche.niveaux[0],
                        dernier: fiche.niveaux[fiche.niveaux.length - 1],
                      })}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <Titre>{t.libre}</Titre>
        <p
          className="mb-6 text-[13px] leading-[1.75]"
          style={{ color: "var(--texte-doux)" }}
        >
          {fiche.disponibilites_texte || t.libreInconnu}
        </p>

        {/* Le tarif, et les deux portes encore fermées.

            Verrouillées à l'œil plutôt qu'absentes : une zone qu'on voit
            fermée se comprend, une zone absente se cherche. Et la phrase dit
            quand elles s'ouvriront. */}
        <div
          className="rounded-[12px] p-4"
          style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
        >
          {fiche.tarif_mensuel ? (
            <>
              <p className="m-0 text-[24px] font-medium tracking-[-0.025em]">
                {francs(fiche.tarif_mensuel)}
              </p>
              <p
                className="mb-4 mt-[3px] text-[12px]"
                style={{ color: "var(--texte-doux)" }}
              >
                {t.parMois}
              </p>
            </>
          ) : (
            <p className="mb-4 text-[15px] font-medium">
              {d.annuaire.sansTarif}
            </p>
          )}

          <button
            type="button"
            disabled
            className="bouton mb-2.5 block w-full px-4 py-3.5 text-[14.5px] opacity-50"
          >
            {t.proposer}
          </button>
          <button
            type="button"
            disabled
            className="bt3 block w-full px-4 py-3 text-[14.5px] opacity-50"
          >
            {t.question}
          </button>

          <p
            className="mt-3 text-[11.5px] leading-relaxed"
            style={{ color: "var(--texte-doux)" }}
          >
            {t.bientot}
          </p>
        </div>

        <p
          className="mx-0.5 mt-3.5 text-[12px] leading-[1.75]"
          style={{ color: "var(--texte-doux)" }}
        >
          {t.salle}
        </p>
      </div>
    </main>
  )
}
