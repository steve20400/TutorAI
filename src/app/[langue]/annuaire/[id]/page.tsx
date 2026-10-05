import Link from "next/link"
import { notFound } from "next/navigation"

import { Coque, ENCRE, ENCRE_DOUX, ENCRE_TEXTE } from "@/composants/coque"
import { francs, initiales } from "../fiche"
import { Proposer, type EnfantChoisissable } from "./proposer"
import { Questionner } from "./questionner"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
} from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"

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

/** Un intitulé de section : petit, espacé, en capitales. */
function Titre({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[10.5px] uppercase tracking-[0.13em] lg:mb-[11px] lg:text-[11.5px]"
      style={{ color: "var(--texte-doux)" }}
    >
      {children}
    </p>
  )
}

/**
 * Le dossier d'un répétiteur.
 *
 * Deux mises en page, données par le canevas. Sur téléphone
 * (`DossierTel.dc.html`) la photographie occupe un bandeau de 360 px et le
 * texte suit en une colonne. Sur grand écran (`Dossier.dc.html`) le bandeau
 * monte à 520 px, la photographie tient la moitié gauche en 560 px, le nom
 * s'écrit en 52 px à côté — et le corps se sépare en deux : le dossier à
 * gauche, le tarif et les boutons dans une colonne de 320 px à droite.
 *
 * L'encre du bandeau ne suit pas le thème : le nom y est posé sur une
 * photographie, et une encre qui s'éclaircirait en sombre rendrait ce texte
 * illisible sur les photos claires. Le contraste tient contre l'image.
 *
 * Deux endroits où je ne suis pas le dessin, et pourquoi. Il porte un
 * « DOSSIER N° 0047 » : il n'y a pas de numéro en base, en fabriquer un serait
 * inventer une donnée. Il montre « 146 séances · 9 ans · 11 élèves » : seule
 * l'expérience existe, les deux autres compteurs n'ont aucune table derrière
 * eux.
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

  let enfants: EnfantChoisissable[] = []
  try {
    const supabase = await supabaseServeur()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const r = await api<{ donnees: EnfantChoisissable[] }>("/v1/enfants")
      enfants = r.donnees ?? []
    }
  } catch {
    enfants = []
  }

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

  const photo = fiche.photo_url
  const masqueTel =
    "linear-gradient(166deg,#000 24%,rgba(0,0,0,.4) 64%,transparent 89%)"
  const masqueGrand =
    "linear-gradient(79deg,#000 36%,rgba(0,0,0,.38) 76%,transparent 96%)"

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} />

      {/* ── Le bandeau ── */}
      <div
        className="relative h-[360px] flex-shrink-0 overflow-hidden lg:h-[520px]"
        style={{ background: ENCRE, color: ENCRE_TEXTE }}
      >
        {/* Téléphone : la photographie couvre tout le bandeau. */}
        <div className="absolute inset-0 lg:hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover"
              style={{
                objectPosition: "center 14%",
                maskImage: masqueTel,
                WebkitMaskImage: masqueTel,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[86px] font-medium opacity-30">
                {initiales(fiche.prenom, fiche.nom)}
              </span>
            </div>
          )}
        </div>

        {/* Grand écran : elle tient la moitié gauche. */}
        <div className="absolute bottom-0 left-0 top-0 hidden w-[560px] lg:block">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover"
              style={{
                objectPosition: "center 16%",
                maskImage: masqueGrand,
                WebkitMaskImage: masqueGrand,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[140px] font-medium opacity-25">
                {initiales(fiche.prenom, fiche.nom)}
              </span>
            </div>
          )}
        </div>

        <div className="absolute left-0 right-0 top-0 flex items-center p-3 lg:hidden">
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

        {/* Le titre : en bas sur téléphone, à droite de la photo sur grand
            écran. */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-3.5 lg:static lg:ml-[560px] lg:px-0 lg:pb-0 lg:pl-6 lg:pr-14 lg:pt-16">
          <p
            className="m-0 text-[10.5px] uppercase tracking-[0.14em] lg:text-[11.5px]"
            style={{ color: "var(--voyant)" }}
          >
            {t.etiquette}
          </p>
          <h1 className="mt-[7px] text-[27px] font-medium leading-[1.12] tracking-[-0.025em] lg:mt-4 lg:text-[52px] lg:leading-[1.08]">
            {nomComplet}
          </h1>
          {sousTitre ? (
            <p
              className="mt-1.5 text-[12.5px] lg:mt-5 lg:text-[15px] lg:leading-[1.8]"
              style={{ color: ENCRE_DOUX }}
            >
              {sousTitre}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Le corps ── */}
      <div className="flex flex-1 flex-col gap-0 px-4 pb-6 pt-4 lg:flex-row lg:gap-14 lg:px-14 lg:pt-9">
        <div className="min-w-0 flex-1">
          <Titre>{t.controle}</Titre>
          {pieces.length === 0 ? (
            <p className="doux mb-6 text-[12.5px] leading-relaxed lg:mb-[34px] lg:text-[14px]">
              {t.controleAucun}
            </p>
          ) : (
            <div
              className="mb-6 rounded-[11px] px-3.5 py-1 lg:mb-[34px] lg:rounded-[14px] lg:px-5 lg:py-1.5"
              style={{
                background: "var(--accent-doux)",
                color: "var(--accent-doux-texte)",
              }}
            >
              {pieces.map((p, i) => (
                <div
                  key={p.cle}
                  className="flex items-baseline justify-between py-[9px] lg:py-[11px]"
                  style={
                    i < pieces.length - 1
                      ? {
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--accent-doux-texte) 22%, transparent)",
                        }
                      : undefined
                  }
                >
                  <span className="text-[12.5px] lg:text-[14px]">
                    {langue === "fr" ? p.libelle_fr : p.libelle_en}
                  </span>
                  <span className="text-[11.5px] lg:text-[13px]">
                    {dateLongue(p.examinee_le)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {fiche.bio ? (
            <>
              <Titre>{t.facon}</Titre>
              <div className="relative mb-6 pl-[30px] lg:mb-[34px] lg:pl-11">
                <span
                  aria-hidden
                  className="absolute left-[-4px] top-[-16px] text-[56px] leading-none opacity-[0.14] lg:top-[-22px] lg:text-[82px]"
                >
                  &laquo;
                </span>
                <p className="m-0 whitespace-pre-line text-[13.5px] leading-[1.8] lg:text-[16.5px] lg:leading-[1.85]">
                  {fiche.bio}
                </p>
              </div>
            </>
          ) : null}

          {fiche.matieres.length > 0 ? (
            <>
              <Titre>{t.enseigne}</Titre>
              <div className="mb-6 lg:mb-[34px]">
                {fiche.matieres.map((m, i) => (
                  <div
                    key={m}
                    className="py-[9px] lg:flex lg:gap-7 lg:py-3"
                    style={
                      i < fiche.matieres.length - 1
                        ? { borderBottom: "1px solid var(--bordure)" }
                        : undefined
                    }
                  >
                    <span className="block text-[13.5px] font-medium lg:w-[190px] lg:flex-shrink-0 lg:text-[15px]">
                      {m}
                    </span>
                    {fiche.niveaux.length > 0 ? (
                      <span
                        className="mt-0.5 block text-[12.5px] lg:mt-0 lg:text-[14px]"
                        style={{ color: "var(--texte-doux)" }}
                      >
                        {fiche.niveaux.join(" · ")}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <Titre>{t.libre}</Titre>
          <p
            className="mb-6 text-[13px] leading-[1.75] lg:mb-0 lg:text-[15px] lg:leading-[1.8]"
            style={{ color: "var(--texte-doux)" }}
          >
            {fiche.disponibilites_texte || t.libreInconnu}
          </p>
        </div>

        {/* La colonne de droite : le tarif, les deux actions, et ce qui est
            promis sur la séance. */}
        <div className="lg:w-[320px] lg:flex-shrink-0">
          <div
            className="rounded-[12px] p-4 lg:rounded-[14px] lg:p-[22px]"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            {fiche.tarif_mensuel ? (
              <>
                <p className="m-0 text-[24px] font-medium tracking-[-0.025em] lg:text-[30px]">
                  {francs(fiche.tarif_mensuel)}
                </p>
                <p
                  className="mb-4 mt-[3px] text-[12px] lg:mb-5 lg:mt-1 lg:text-[13px]"
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

            <Proposer
              repetiteurId={fiche.id}
              matieres={fiche.matieres}
              enfants={enfants}
              langue={langue}
              d={d}
            />

            {enfants.length > 0 ? (
              <Questionner repetiteurId={fiche.id} langue={langue} d={d} />
            ) : null}
          </div>

          <div className="px-1.5 pt-4 lg:pt-[18px]">
            <p
              className="m-0 mb-3 text-[12px] leading-[1.75] lg:text-[13px] lg:leading-[1.8]"
              style={{ color: "var(--texte-doux)" }}
            >
              {t.salle}
            </p>
          </div>

          {fiche.annees_experience ? (
            <div
              className="mt-2 rounded-[10px] px-2 py-3.5 text-center lg:mt-[18px]"
              style={{
                background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
              }}
            >
              <p className="m-0 text-[20px] font-medium">
                {pluriel(langue, fiche.annees_experience, d.annuaire.ans)}
              </p>
              <p
                className="m-0 mt-0.5 text-[12px]"
                style={{ color: "var(--texte-doux)" }}
              >
                {t.experience}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
