import Link from "next/link"
import { redirect } from "next/navigation"

import { Coque, ENCRE, ENCRE_DOUX, ENCRE_TEXTE } from "@/composants/coque"
import {
  PropositionsRepetiteur,
  type Proposition,
} from "@/composants/propositions-repetiteur"
import { MesCours } from "@/composants/mes-cours"
import { lireMesCours } from "@/lib/cours"
import { TempsReel } from "@/composants/temps-reel"
import { francs, initiales } from "../annuaire/fiche"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
  type Dictionnaire,
} from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"

const STATUTS = ["brouillon", "en_attente", "verifie", "refuse"] as const
type Statut = (typeof STATUTS)[number]

type ReponseProfil = {
  fiche: {
    id: string
    bio: string | null
    ville: string | null
    matieres: string[] | null
    niveaux: string[] | null
    tarif_mensuel: number | null
    annees_experience: number | null
    disponibilites_texte: string | null
    statut: string
    motif_refus: string | null
    verifie_le: string | null
    photo_url: string | null
  } | null
  profil: {
    prenom: string | null
    nom: string | null
  } | null
}

type Piece = { cle: string; libelle_fr: string; libelle_en: string; examinee_le: string | null }

/**
 * L'espace du répétiteur : son dossier.
 *
 * Il avait un formulaire pour accueil. On se connectait, et on tombait sur
 * ses propres champs de saisie — comme si l'on n'existait sur la plateforme
 * qu'en tant que fiche à remplir. Steve a donné l'image juste : entrer chez
 * soi doit ressembler à entrer dans sa chaîne, c'est-à-dire voir sa page
 * telle que les autres la voient, avec de quoi la modifier.
 *
 * C'est donc exactement le dossier public — `Dossier.dc.html`, le même
 * bandeau, la même colonne de 320 px, les mêmes intitulés — et trois
 * différences, toutes nécessaires :
 *
 * 1. LES MANQUES SE VOIENT. Chez un inconnu, une section vide disparaît :
 *    elle n'apprend rien. Ici elle doit rester, et dire ce qu'elle attend.
 *    Sans photo ni matière, ce dossier ne ressort d'aucune recherche, et rien
 *    dans l'ancien écran ne le lui disait.
 *
 * 2. LA COLONNE DE DROITE CHANGE DE MAIN. Une famille y trouve « proposer une
 *    séance » ; lui y trouve l'état de son dossier et le bouton pour le
 *    modifier. Le tarif reste en tête, à la même place, parce que c'est la
 *    même page.
 *
 * 3. CE QUI PRESSE PASSE DEVANT. Une proposition reçue attend une réponse et
 *    une famille attend avec elle : elle s'ouvre au-dessus du dossier, pas
 *    derrière un menu.
 */
export default async function PageEspaceRepetiteur({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.repetiteurAccueil
  const td = d.annuaire.dossier

  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))

  let reponse: ReponseProfil | null = null
  try {
    reponse = await api<ReponseProfil>("/v1/repetiteur/profil")
  } catch {
    reponse = null
  }

  const fiche = reponse?.fiche ?? null
  const profil = reponse?.profil ?? null

  // `fiche` est nulle pour qui n'est pas répétiteur : la politique de lecture
  // ne lui renvoie rien. Cela suffit à écarter un parent tombé sur l'adresse.
  if (!fiche) redirect(chemin(langue, "/"))

  const [pieces, propositions, cours] = await Promise.all([
    api<{ donnees: Piece[] }>("/v1/repetiteur/pieces")
      .then((r) => r.donnees ?? [])
      .catch(() => [] as Piece[]),
    api<{ donnees: Proposition[] }>("/v1/contrats/propositions")
      .then((r) => r.donnees ?? [])
      .catch(() => [] as Proposition[]),
    lireMesCours(),
  ])

  const statut: Statut = (STATUTS as readonly string[]).includes(fiche.statut)
    ? (fiche.statut as Statut)
    : "brouillon"
  const etape = d.repetiteurProfil.statuts[statut]

  const nomComplet = [profil?.prenom, profil?.nom].filter(Boolean).join(" ")
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
      ? remplir(td.controleLe, { date: dateLongue(fiche.verifie_le) ?? "" })
      : null,
    fiche.ville,
  ]
    .filter(Boolean)
    .join(" · ")

  const matieres = fiche.matieres ?? []
  const niveaux = fiche.niveaux ?? []
  // Les pièces affichables : celles qui ont été examinées. Une pièce déposée
  // mais pas encore vue n'a rien prouvé, et la famille ne la verra pas non
  // plus — l'afficher ici donnerait une page différente de la sienne.
  const examinees = pieces.filter((p) => p.examinee_le)

  const masqueTel =
    "linear-gradient(166deg,#000 24%,rgba(0,0,0,.4) 64%,transparent 89%)"
  const masqueGrand =
    "linear-gradient(79deg,#000 36%,rgba(0,0,0,.38) 76%,transparent 96%)"
  const photo = fiche.photo_url

  const versProfil = chemin(langue, "/repetiteur/profil")

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} />

      {/* Une proposition peut arriver pendant qu'il est sur cet écran : il ne
          doit pas avoir à recharger pour la découvrir. */}
      <TempsReel tables={["contrats"]} />

      {/* ── Le bandeau, celui du dossier public ── */}
      <div
        className="relative h-[360px] flex-shrink-0 overflow-hidden lg:h-[520px]"
        style={{ background: ENCRE, color: ENCRE_TEXTE }}
      >
        <div className="absolute inset-0 lg:hidden">
          <Photo
            photo={photo}
            masque={masqueTel}
            position="center 14%"
            initiales={initiales(profil?.prenom ?? null, profil?.nom ?? null)}
            taille="text-[86px]"
          />
        </div>
        <div className="absolute bottom-0 left-0 top-0 hidden w-[560px] lg:block">
          <Photo
            photo={photo}
            masque={masqueGrand}
            position="center 16%"
            initiales={initiales(profil?.prenom ?? null, profil?.nom ?? null)}
            taille="text-[140px]"
          />
        </div>

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

          {/* Le canevas pose ici « ✓ Dossier complet ». La phrase change avec
              l'état réel : annoncer « complet » un dossier que personne n'a
              encore regardé serait la seule invention de cette page. */}
          {statut === "verifie" ? (
            <div
              className="mt-3 flex items-center gap-2.5 text-[12.5px] lg:mt-[26px] lg:gap-2.5 lg:text-[14px]"
              style={{ color: "#bfe6d7" }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="block shrink-0"
              >
                <path d="m4 12.5 5 5L20 6.5" />
              </svg>
              <span>{t.visible}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Le corps ── */}
      <div className="flex flex-1 flex-col gap-0 px-4 pb-6 pt-4 lg:flex-row lg:gap-14 lg:px-14 lg:pt-9">
        <div className="min-w-0 flex-1">
          {/* Tant qu'il n'est pas vérifié, aucune famille ne le voit. C'est
              le fait le plus important de cet écran, il passe donc devant. */}
          {statut !== "verifie" ? (
            <section
              className="carte mb-6 p-4 lg:mb-[34px]"
              style={{
                borderLeft:
                  statut === "refuse"
                    ? "3px solid #b91c1c"
                    : "3px solid var(--voyant)",
              }}
            >
              <div className="text-[14px] font-medium">{etape.titre}</div>
              <p className="doux mt-1 text-[13px] leading-relaxed">
                {etape.detail}
              </p>
              {fiche.motif_refus ? (
                <p className="mt-2 rounded-lg bg-red-600/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-400">
                  {fiche.motif_refus}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Les cours avant le dossier : quand une séance est ouverte, c'est
              la seule chose qui compte sur cet écran. */}
          {cours.length > 0 ? (
            <div className="mb-6 lg:mb-[34px]">
              <MesCours cours={cours} langue={langue} d={d} />
            </div>
          ) : null}

          {propositions.length > 0 ? (
            <div className="mb-6 lg:mb-[34px]">
              <PropositionsRepetiteur
                propositions={propositions}
                langue={langue}
                d={d}
              />
            </div>
          ) : null}

          <Titre>{td.controle}</Titre>
          {examinees.length === 0 ? (
            <Manque texte={d.repetiteurProfil.pieces.detail} vers={versProfil} d={d} />
          ) : (
            <div
              className="mb-6 rounded-[11px] px-3.5 py-1 lg:mb-[34px] lg:rounded-[14px] lg:px-5 lg:py-1.5"
              style={{
                background: "var(--accent-doux)",
                color: "var(--accent-doux-texte)",
              }}
            >
              {examinees.map((p, i) => (
                <div
                  key={p.cle}
                  className="flex items-baseline justify-between py-[9px] lg:py-[11px]"
                  style={
                    i < examinees.length - 1
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

          <Titre>{t.facon}</Titre>
          {fiche.bio ? (
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
          ) : (
            <Manque texte={t.sansBio} vers={versProfil} d={d} />
          )}

          <Titre>{t.enseigne}</Titre>
          {matieres.length > 0 ? (
            <div className="mb-6 lg:mb-[34px]">
              {matieres.map((m, i) => (
                <div
                  key={m}
                  className="py-[9px] lg:flex lg:gap-[26px] lg:py-3"
                  style={
                    i < matieres.length - 1
                      ? { borderBottom: "1px solid var(--bordure)" }
                      : undefined
                  }
                >
                  <span className="block text-[13.5px] font-medium lg:w-[190px] lg:flex-shrink-0 lg:text-[15px]">
                    {m}
                  </span>
                  {niveaux.length > 0 ? (
                    <span
                      className="mt-0.5 block text-[12.5px] lg:mt-0 lg:text-[14px]"
                      style={{ color: "var(--texte-doux)" }}
                    >
                      {niveaux.join(" · ")}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Manque texte={t.sansMatiere} vers={versProfil} d={d} />
          )}

          <Titre>{t.libre}</Titre>
          {fiche.disponibilites_texte ? (
            <p
              className="mb-6 text-[13px] leading-[1.75] lg:mb-0 lg:text-[15px] lg:leading-[1.8]"
              style={{ color: "var(--texte-doux)" }}
            >
              {fiche.disponibilites_texte}
            </p>
          ) : (
            <Manque texte={t.sansDisponibilite} vers={versProfil} d={d} />
          )}
        </div>

        {/* La colonne de 320 px du canevas, à lui cette fois : le tarif à la
            même place, et dessous ce que seule une famille n'a pas à voir. */}
        <div className="mt-6 lg:mt-0 lg:w-[320px] lg:flex-shrink-0">
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
                  {td.parMois}
                </p>
              </>
            ) : (
              <p className="doux mb-4 text-[13px] leading-relaxed lg:mb-5">
                {t.sansTarif}
              </p>
            )}

            <Link
              href={versProfil}
              className="bouton mb-2.5 block w-full rounded-[9px] px-4 py-3.5 text-center text-[15px]"
            >
              {t.modifier}
            </Link>
            <Link
              href={`${versProfil}#pieces`}
              className="block w-full rounded-[9px] border px-4 py-3 text-center text-[15px] transition hover:opacity-70"
              style={{ borderColor: "var(--bordure)" }}
            >
              {t.pieces}
            </Link>
          </div>

          <div className="px-1.5 pt-4 lg:pt-[18px]">
            <p
              className="m-0 text-[12px] leading-[1.75] lg:text-[13px] lg:leading-[1.8]"
              style={{ color: "var(--texte-doux)" }}
            >
              {t.telQue}
            </p>
          </div>

          {fiche.annees_experience ? (
            <div
              className="mt-3 rounded-[10px] px-1.5 py-3.5 text-center lg:mt-[18px]"
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
                {td.experience}
              </p>
            </div>
          ) : null}

          {!photo ? (
            <div className="px-1.5 pt-4">
              <Manque texte={t.sansPhoto} vers={versProfil} d={d} serre />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
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
 * Une section vide, dite comme un manque.
 *
 * Pas une alerte rouge : rien n'est cassé, il reste simplement quelque chose
 * à écrire. Mais pas un blanc non plus — un blanc se confond avec une page
 * terminée, et c'est ainsi qu'on reste invisible dans l'annuaire sans jamais
 * savoir pourquoi.
 */
function Manque({
  texte,
  vers,
  d,
  serre,
}: {
  texte: string
  vers: string
  d: Dictionnaire
  serre?: boolean
}) {
  return (
    <div
      className={`${serre ? "mb-0" : "mb-6 lg:mb-[34px]"} rounded-[11px] px-3.5 py-3 lg:rounded-[12px] lg:px-4 lg:py-3.5`}
      style={{
        background: "color-mix(in srgb, var(--texte) 4%, var(--fond))",
        border: "1px dashed var(--bordure)",
      }}
    >
      <p
        className="m-0 text-[12.5px] leading-[1.7] lg:text-[13.5px]"
        style={{ color: "var(--texte-doux)" }}
      >
        {texte}
      </p>
      <Link
        href={vers}
        className="mt-1.5 inline-block text-[12.5px] underline underline-offset-4 transition hover:opacity-70 lg:text-[13.5px]"
      >
        {d.repetiteurAccueil.completer}
      </Link>
    </div>
  )
}

/** La photographie du bandeau, ou les initiales quand il n'y en a pas. */
function Photo({
  photo,
  masque,
  position,
  initiales: lettres,
  taille,
}: {
  photo: string | null
  masque: string
  position: string
  initiales: string
  taille: string
}) {
  if (!photo) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className={`${taille} font-medium opacity-25`}>{lettres}</span>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt=""
      className="h-full w-full object-cover"
      style={{
        objectPosition: position,
        maskImage: masque,
        WebkitMaskImage: masque,
      }}
    />
  )
}
