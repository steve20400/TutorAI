import Link from "next/link"
import { BoutonAction } from "@/composants/bouton-action"

import { desactiverCompte, reactiverCompte } from "@/actions/admin"
import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Avatar } from "@/composants/avatar"
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

type Personne = {
  id: string
  prenom: string | null
  nom: string | null
  identifiant: string | null
  telephone?: string | null
  pays?: string | null
  cree_le?: string | null
  desactive_le?: string | null
  motif_desactivation?: string | null
  photo_url?: string | null
  /** Lue par une fonction réservée à l'administration : `profils` ne la porte
   *  pas, elle vit dans auth.users. Nulle pour une adresse interne d'élève,
   *  que personne ne relève. */
  courriel?: string | null
}

type Contrat = {
  id: string
  eleve_id: string
  matiere: string
  tarif: number | null
  frequence: string | null
  demarre_le: string | null
  termine_le: string | null
  repetiteur: Personne | null
  seances: number
}

type Famille = {
  parent: Personne
  enfants: Personne[]
  /**
   * Ce que cet adulte a tenté pour se rattacher à des enfants.
   *
   * C'est l'information qui décide, quand on arrive ici depuis une alerte.
   */
  tentatives?: {
    refusees: number
    acceptees: number
    en_attente: number
    /** Des enfants distincts qui l'ont retiré après l'avoir accepté. */
    detaches_par_enfant: number
    /** Des enfants dont il s'est retiré lui-même. */
    detaches_par_adulte: number
  }
  contrats: Contrat[]
}

const nomDe = (p: Personne | null) =>
  [p?.prenom, p?.nom].filter(Boolean).join(" ") || "—"

/**
 * Une famille, vue par l'administration.
 *
 * C'est l'écran d'arbitrage. Le jour où un parent conteste quelque chose, il
 * faut pouvoir dire qui est cette famille, avec quel répétiteur, depuis quand,
 * et combien de séances ont eu lieu. Une liste de noms ne répond à aucune de
 * ces questions — et sans réponse, le litige se règle ailleurs qu'ici.
 */
export default async function PageFamille({
  params,
}: {
  params: Promise<{ langue: string; id: string }>
}) {
  const { langue: brut, id } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.familles

  await exigerAdmin(langue)

  let famille: Famille | null = null
  try {
    famille = await api<Famille>(`/v1/admin/familles/${id}`)
  } catch {
    famille = null
  }

  if (!famille) {
    return (
      <>
        <EnteteAdmin
        retourVers={chemin(langue, "/admin/familles")} etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} />
      </>
    )
  }

  const { parent, enfants, contrats, tentatives } = famille
  const dateCourte = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString(d.meta.htmlLang) : "—"

  return (
    <>
      <EnteteAdmin etiquette={t.detailFamille} titre={nomDe(parent)} />

      <div className="max-w-3xl px-5 pb-7 sm:px-7">
        {/* Le parent */}
        <section className="carte p-5">
          <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.leParent}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <Avatar nom={nomDe(parent)} photoUrl={parent.photo_url ?? null} taille={58} />
            <div className="min-w-0">
              <p className="text-[15px] font-medium">{nomDe(parent)}</p>
              {parent.identifiant ? (
                <p className="doux font-mono text-[11.5px]">
                  {parent.identifiant}
                </p>
              ) : null}
              {parent.telephone ? (
                <p className="doux mt-0.5 text-[12.5px]">{parent.telephone}</p>
              ) : null}
              {parent.courriel ? (
                <a
                  href={`mailto:${parent.courriel}`}
                  className="doux mt-0.5 block truncate text-[12.5px] underline underline-offset-2"
                >
                  {parent.courriel}
                </a>
              ) : null}
              <p className="doux mt-0.5 text-[11.5px]">
                {remplir(t.inscritLe, { date: dateCourte(parent.cree_le) })}
              </p>
            </div>
          </div>

          {/* La désactivation vit ici et non dans la liste : on ne ferme pas un
              compte depuis un tableau, sans avoir vu ce qu'il contient. */}
          <div
            className="mt-5 border-t pt-4"
            style={{ borderColor: "var(--bordure)" }}
          >
            {parent.desactive_le ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="badge-eteint">
                  {remplir(t.compteDesactiveLe, {
                    date: dateCourte(parent.desactive_le),
                  })}
                </span>
                {parent.motif_desactivation ? (
                  <span className="doux text-[12.5px]">
                    {parent.motif_desactivation}
                  </span>
                ) : null}
                <form action={reactiverCompte}>
                  <input type="hidden" name="langue" value={langue} />
                  <input type="hidden" name="compteId" value={parent.id} />
                  <BoutonAction className="bt2">
                    {d.adminPages.dossier.reactiver}
                  </BoutonAction>
                </form>
              </div>
            ) : (
              <form
                action={desactiverCompte}
                className="flex flex-wrap items-start gap-2"
              >
                <input type="hidden" name="langue" value={langue} />
                <input type="hidden" name="compteId" value={parent.id} />
                <input
                  name="motif"
                  required
                  placeholder={d.adminPages.dossier.motifDesactivation}
                  className="champ min-w-[220px] flex-1 px-3 py-2 text-[13px]"
                />
                <BoutonAction
                  className="bt2"
                  style={{
                    color: "var(--erreur-texte)",
                    borderColor: "var(--erreur-texte)",
                  }}
                >
                  {d.adminPages.dossier.desactiver}
                </BoutonAction>
              </form>
            )}
          </div>
        </section>

        {/* Les tentatives de rattachement.

            Affichées seulement s'il y a eu des refus : pour un parent
            ordinaire, ce bloc n'a rien à dire et n'a pas à occuper l'écran. */}
        {tentatives && tentatives.refusees > 0 ? (
          <section
            className="carte mt-4 p-5"
            style={{ borderColor: "var(--erreur-texte)" }}
          >
            <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
              {t.rattachements}
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed">
              {remplir(t.rattachementsDetail, {
                refusees: tentatives.refusees,
                acceptees: tentatives.acceptees,
              })}
            </p>
            <p className="doux mt-2 text-[12px] leading-relaxed">
              {t.rattachementsAide}
            </p>
          </section>
        ) : null}

        {/* Les rattachements défaits.

            Un bloc à part, et sans bordure d'alerte : un détachement n'est
            pas un refus. Affiché dès qu'il y en a un dans un sens ou dans
            l'autre — contrairement aux refus, un seul se lit déjà, parce
            qu'il dit quelque chose du lien plutôt que de l'insistance. */}
        {tentatives &&
        (tentatives.detaches_par_enfant > 0 ||
          tentatives.detaches_par_adulte > 0) ? (
          <section className="carte mt-4 p-5">
            <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
              {t.detachements}
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed">
              {remplir(t.detachementsDetail, {
                parEnfant: tentatives.detaches_par_enfant,
                parAdulte: tentatives.detaches_par_adulte,
              })}
            </p>
            <p className="doux mt-2 text-[12px] leading-relaxed">
              {t.detachementsAide}
            </p>
          </section>
        ) : null}

        {/* Les enfants */}
        <section className="carte mt-4 p-5">
          <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.lesEnfants}
          </div>

          {enfants.length === 0 ? (
            <p className="doux mt-2 text-[13px]">{t.aucunEnfantRattache}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {enfants.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <Avatar nom={nomDe(e)} photoUrl={e.photo_url ?? null} taille={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">{nomDe(e)}</p>
                    <p className="doux font-mono text-[11px]">
                      {e.identifiant}
                    </p>
                  </div>
                  {e.desactive_le ? (
                    <span className="badge-eteint">
                      {remplir(t.compteDesactiveLe, {
                        date: dateCourte(e.desactive_le),
                      })}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Les répétiteurs engagés */}
        <section className="carte mt-4 p-5">
          <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.lesContrats}
          </div>

          {contrats.length === 0 ? (
            <p className="doux mt-2 text-[13px]">{t.aucunContrat}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {contrats.map((c) => {
                const eleve = enfants.find((e) => e.id === c.eleve_id)
                return (
                  <div
                    key={c.id}
                    className="border-t pt-3 first:border-t-0 first:pt-0"
                    style={{ borderColor: "var(--bordure)" }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13.5px] font-medium">
                        {d.matieres[c.matiere] ?? c.matiere}
                        {eleve ? ` · ${nomDe(eleve)}` : ""}
                      </span>
                      <span className="doux text-[12px]">
                        {c.seances} {pluriel(langue, c.seances, t.seancesTenues)}
                      </span>
                    </div>
                    <p className="doux mt-1 text-[12.5px]">
                      {c.repetiteur ? (
                        <Link
                          href={chemin(
                            langue,
                            `/admin/dossiers/${c.repetiteur.id}`,
                          )}
                          className="underline underline-offset-2"
                        >
                          {nomDe(c.repetiteur)}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {" · "}
                      {remplir(t.depuisLe, { date: dateCourte(c.demarre_le) })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
