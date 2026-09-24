import Link from "next/link"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Avatar } from "@/composants/avatar"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

type Personne = {
  id: string
  prenom: string | null
  nom: string | null
  identifiant: string | null
  photo_url: string | null
  telephone?: string | null
}

type Detail = {
  seance: {
    id: string
    demarree_le: string | null
    terminee_le: string | null
    lecon_id: string | null
    enregistrement_url: string | null
    compte_rendu: Record<string, unknown> | null
  }
  contrat: { matiere: string; tarif: number | null } | null
  eleve: Personne | null
  repetiteur: Personne | null
  parent: Personne | null
  /** Lien signé, valable quinze minutes. Nul si rien n'a été enregistré. */
  enregistrement: string | null
}

const nomDe = (p: Personne | null) =>
  [p?.prenom, p?.nom].filter(Boolean).join(" ") || "—"

/**
 * Une séance en détail.
 *
 * C'est ce qu'on ouvre quand un parent conteste. L'enregistrement et le compte
 * rendu sont la réponse — quand ils existent. Tant que le module est éteint,
 * l'écran le dit clairement : rien n'a été perdu, rien n'a été capté. Laisser
 * un cadre vide ferait croire à une perte.
 */
export default async function PageSeance({
  params,
}: {
  params: Promise<{ langue: string; id: string }>
}) {
  const { langue: brut, id } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.seances

  await exigerAdmin(langue)

  let detail: Detail | null = null
  try {
    detail = await api<Detail>(`/v1/admin/seances/${id}`)
  } catch {
    detail = null
  }

  if (!detail) {
    return (
      <>
        <EnteteAdmin
        retourVers={chemin(langue, "/admin/seances")} etiquette={t.etiquette} titre={t.seanceIntrouvable} />
        <RienEncore titre={t.seanceIntrouvable} />
      </>
    )
  }

  const { seance, contrat, eleve, repetiteur, parent, enregistrement } = detail
  const debut = seance.demarree_le ? new Date(seance.demarree_le) : null
  const fin = seance.terminee_le ? new Date(seance.terminee_le) : null
  const active = Boolean(debut && !fin)
  const n = debut
    ? Math.max(
        0,
        Math.round(((fin ?? new Date()).getTime() - debut.getTime()) / 60000),
      )
    : 0

  const partie = (titre: string, p: Personne | null, lien?: string) => (
    <div className="flex items-center gap-3">
      <Avatar nom={nomDe(p)} photoUrl={p?.photo_url ?? null} taille={38} />
      <div className="min-w-0 flex-1">
        <p className="doux text-[10px] font-semibold uppercase tracking-[0.12em]">
          {titre}
        </p>
        {lien && p ? (
          <Link
            href={chemin(langue, lien)}
            className="block truncate text-[13.5px] font-medium underline underline-offset-2"
          >
            {nomDe(p)}
          </Link>
        ) : (
          <p className="truncate text-[13.5px] font-medium">{nomDe(p)}</p>
        )}
        {p?.identifiant ? (
          <p className="doux font-mono text-[11px]">{p.identifiant}</p>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <EnteteAdmin
        etiquette={t.detailSeance}
        titre={
          contrat?.matiere
            ? (d.matieres[contrat.matiere] ?? contrat.matiere)
            : t.detailSeance
        }
      />

      <div className="max-w-3xl px-5 pb-7 sm:px-7">
        <section className="carte p-5">
          <div className="flex flex-wrap items-center gap-3">
            {active ? (
              <span
                className="h-[8px] w-[8px] rounded-full"
                style={{ background: "var(--voyant)" }}
                aria-hidden
              />
            ) : null}
            <span className="text-[14px]">
              {active
                ? remplir(t.enCoursDepuis, { n })
                : remplir(t.duree, { n })}
            </span>
            {debut ? (
              <span className="doux text-[12.5px]">
                {remplir(t.leSeance, {
                  date: debut.toLocaleDateString(d.meta.htmlLang),
                  heure: debut.toLocaleTimeString(d.meta.htmlLang, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </span>
            ) : null}
          </div>
        </section>

        <section className="carte mt-4 flex flex-col gap-4 p-5">
          <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.lesParties}
          </div>
          {partie(t.leleve, eleve)}
          {partie(
            t.lerepetiteur,
            repetiteur,
            repetiteur ? `/admin/dossiers/${repetiteur.id}` : undefined,
          )}
          {partie(
            t.leparent,
            parent,
            parent ? `/admin/familles/${parent.id}` : undefined,
          )}
        </section>

        <section className="carte mt-4 p-5">
          <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.enregistrement}
          </div>

          {enregistrement ? (
            <video
              src={enregistrement}
              controls
              className="mt-3 w-full rounded-[9px]"
              style={{ maxHeight: "60vh", background: "#0a101c" }}
            />
          ) : (
            <p className="doux mt-2 text-[13px] leading-relaxed">
              {t.enregistrementAbsent}
            </p>
          )}
        </section>

        <section className="carte mt-4 p-5">
          <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t.compteRendu}
          </div>

          {seance.compte_rendu ? (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[12.5px] leading-relaxed">
              {JSON.stringify(seance.compte_rendu, null, 2)}
            </pre>
          ) : (
            <p className="doux mt-2 text-[13px]">{t.compteRenduAbsent}</p>
          )}
        </section>
      </div>
    </>
  )
}
