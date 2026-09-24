import Link from "next/link"
import { BoutonAction } from "@/composants/bouton-action"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Avatar } from "@/composants/avatar"
import { LecteurPiece } from "@/composants/admin/lecteur"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import {
  apposerCachet,
  desactiverCompte,
  reactiverCompte,
  refuserDossier,
} from "@/actions/admin"

type FicheComplete = {
  fiche: {
    id: string
    ville: string | null
    bio: string | null
    matieres: string[] | null
    niveaux: string[] | null
    tarif_mensuel: number | null
    annees_experience: number | null
    disponibilites_texte: string | null
    statut: string
    verifie_le: string | null
    motif_refus: string | null
    photo_url: string | null
  } | null
  profil: {
    prenom: string | null
    nom: string | null
    identifiant: string | null
    telephone: string | null
    desactive_le: string | null
    motif_desactivation: string | null
  } | null
  pieces: {
    id: string
    type_cle: string
    statut: string
    motif: string | null
    /** Nul tant qu'aucun fichier n'a été déposé pour cette pièce. */
    chemin: string | null
    deposee_le: string | null
  }[]
  types: {
    cle: string
    libelle_fr: string
    libelle_en: string
    requise: boolean
    ordre: number
  }[]
}

export default async function PageDossier({
  params,
}: {
  params: Promise<{ langue: string; id: string }>
}) {
  const { langue: brut, id } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.dossier

  await exigerAdmin(langue)

  // Une seule requête pour tout l'écran : la fiche, l'identité, les pièces
  // déposées et celles qui sont attendues. Quatre allers-retours vers un
  // service qui peut dormir auraient rendu ce dossier plus long à ouvrir
  // qu'à traiter.
  let reponse: FicheComplete | null = null
  try {
    reponse = await api<FicheComplete>(`/v1/admin/dossiers/${id}`)
  } catch {
    reponse = null
  }

  const fiche = reponse?.fiche ?? null
  const types = reponse?.types ?? []
  const pieces = reponse?.pieces ?? []
  const profil = reponse?.profil ?? null

  if (!fiche) {
    return (
      <>
        <EnteteAdmin etiquette={t.retour} titre={t.introuvable} />
        <RienEncore titre={t.introuvable} />
      </>
    )
  }


  const nom = [profil?.prenom, profil?.nom].filter(Boolean).join(" ") || "—"
  const deposees = new Map((pieces ?? []).map((p) => [p.type_cle, p]))

  return (
    <>
      <div className="px-5 sm:px-7 pt-7">
        <Link
          href={chemin(langue, "/admin/dossiers")}
          className="doux text-[12px] hover:underline"
        >
          ‹ {t.retour}
        </Link>
      </div>

      <EnteteAdmin etiquette={fiche.ville ?? "—"} titre={nom} />

      <div className="max-w-3xl px-5 sm:px-7 pb-7">
        {/* Le visage, ou les initiales en attendant.
            Vérifier un dossier, c'est décider si cette personne approchera un
            enfant. Une fiche sans visage rend la décision plus abstraite
            qu'elle ne l'est — et le jour où le répétiteur dépose sa photo,
            c'est ici qu'elle doit apparaître, sans autre changement. */}
        <div className="mb-5 flex items-center gap-4">
          <Avatar
            nom={nom}
            photoUrl={fiche.photo_url ?? null}
            taille={72}
          />
          <div className="min-w-0">
            <p className="text-[15px] font-medium">{nom}</p>
            {profil?.identifiant ? (
              <p className="doux font-mono text-[11.5px]">
                {profil.identifiant}
              </p>
            ) : null}
            {profil?.telephone ? (
              <p className="doux mt-0.5 text-[12.5px]">{profil.telephone}</p>
            ) : null}
          </div>
        </div>

        <p className="doux text-[13px] leading-relaxed">
          {(fiche.niveaux ?? []).map((n: string) => d.niveaux[n] ?? n).join(", ")}
          {" · "}
          {(fiche.matieres ?? []).map((m: string) => d.matieres[m] ?? m).join(", ")}
          {fiche.annees_experience
            ? ` · ${pluriel(langue, fiche.annees_experience, t.experience)}`
            : ""}
          {fiche.tarif_mensuel
            ? ` · ${remplir(t.tarif, { n: fiche.tarif_mensuel })}`
            : ""}
        </p>

        {fiche.bio ? (
          <p className="mt-4 text-[13.5px] leading-relaxed">{fiche.bio}</p>
        ) : null}

        <h2 className="doux mt-7 text-[10px] font-semibold uppercase tracking-[0.14em]">
          {t.pieces}
        </h2>

        <div className="mt-3 flex flex-wrap gap-3">
          {(types ?? []).map((ty) => {
            const p = deposees.get(ty.cle)
            const libelle = langue === "en" ? ty.libelle_en : ty.libelle_fr
            const manquante = !p
            return (
              <div
                key={ty.cle}
                className="min-w-[150px] flex-1 rounded-[8px] p-3"
                style={{
                  border: manquante && ty.requise
                    ? "1px solid var(--voyant)"
                    : "1px solid var(--bordure)",
                  background: "var(--surface)",
                }}
              >
                <div className="doux text-[9.5px] font-semibold uppercase tracking-[0.12em]">
                  {libelle} · {ty.requise ? t.requise : t.facultative}
                </div>
                <div
                  className="mt-1.5 text-[12.5px] font-medium"
                  style={{
                    color: manquante
                      ? ty.requise
                        ? "var(--voyant)"
                        : "var(--texte-doux)"
                      : p.statut === "lisible"
                        ? "var(--accent-doux-texte)"
                        : "var(--voyant)",
                  }}
                >
                  {manquante
                    ? t.manquante
                    : t.statuts[p.statut as keyof typeof t.statuts]}
                </div>

                {/* On consulte ici, on ne télécharge que si on en a besoin.
                    Obliger à télécharger laisserait des copies de cartes
                    d'identité dans le dossier « Téléchargements » de
                    quiconque vérifie — sur un ordinateur partagé, c'est
                    exactement ce qu'il ne faut pas. */}
                {p ? (
                  <div className="mt-2.5">
                    <LecteurPiece
                      pieceId={p.id}
                      libelle={libelle}
                      disponible={Boolean(p.chemin)}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
          {(types ?? []).length === 0 ? (
            <p className="doux text-[13px]">{t.aucunePiece}</p>
          ) : null}
        </div>

        <div
          className="mt-7 flex flex-wrap gap-3 border-t pt-5"
          style={{ borderColor: "var(--bordure)" }}
        >
          <form action={apposerCachet}>
            <input type="hidden" name="langue" value={langue} />
            <input type="hidden" name="repetiteurId" value={fiche.id} />
            <BoutonAction className="bt1">
              {d.adminPages.dossiers.apposer}
            </BoutonAction>
          </form>

          <form action={refuserDossier} className="flex flex-wrap items-start gap-2">
            <input type="hidden" name="langue" value={langue} />
            <input type="hidden" name="repetiteurId" value={fiche.id} />
            <label className="flex flex-col">
              <input
                name="motif"
                required
                placeholder={t.motifRefus}
                className="champ min-w-[220px] px-3 py-2 text-[13px]"
              />
              <span className="doux mt-1 max-w-[260px] text-[11px] leading-snug">
                {t.motifObligatoire}
              </span>
            </label>
            <BoutonAction
              className="bt2"
              style={{ color: "var(--erreur-texte)", borderColor: "var(--erreur-texte)" }}
            >
              {t.refuser}
            </BoutonAction>
          </form>
        </div>

        {/* La désactivation, à part et sous les décisions de vérification :
            elle ne juge pas un dossier, elle ferme un compte. Jamais de
            suppression — effacer l'auteur d'une séance effacerait la séance. */}
        <div
          className="mt-7 border-t pt-5"
          style={{ borderColor: "var(--bordure)" }}
        >
          {profil?.desactive_le ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge-eteint">
                {remplir(t.desactiveDepuis, {
                  date: new Date(profil.desactive_le).toLocaleDateString(
                    d.meta.htmlLang,
                  ),
                })}
              </span>
              <form action={reactiverCompte}>
                <input type="hidden" name="langue" value={langue} />
                <input type="hidden" name="compteId" value={fiche.id} />
                <BoutonAction className="bt2">
                  {t.reactiver}
                </BoutonAction>
              </form>
            </div>
          ) : (
            <form
              action={desactiverCompte}
              className="flex flex-wrap items-start gap-2"
            >
              <input type="hidden" name="langue" value={langue} />
              <input type="hidden" name="compteId" value={fiche.id} />
              <label className="flex flex-col">
                <input
                  name="motif"
                  required
                  placeholder={t.motifDesactivation}
                  className="champ min-w-[220px] px-3 py-2 text-[13px]"
                />
                <span className="doux mt-1 max-w-[380px] text-[11px] leading-snug">
                  {t.desactivationDetail}
                </span>
              </label>
              <BoutonAction
                className="bt2"
                style={{
                  color: "var(--erreur-texte)",
                  borderColor: "var(--erreur-texte)",
                }}
              >
                {t.desactiver}
              </BoutonAction>
            </form>
          )}
        </div>

        <p className="doux mt-5 text-[12px] leading-relaxed">{t.consigne}</p>
      </div>
    </>
  )
}
