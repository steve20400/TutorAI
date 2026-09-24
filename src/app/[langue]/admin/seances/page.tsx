import Link from "next/link"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Avatar } from "@/composants/avatar"
import { Filtres } from "@/composants/admin/filtres"
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
  photo_url: string | null
}

type Seance = {
  id: string
  contrat_id: string
  demarree_le: string | null
  terminee_le: string | null
  enregistrement_url: string | null
  matiere: string | null
  eleve: Personne | null
  repetiteur: Personne | null
}

const nomDe = (p: Personne | null) =>
  [p?.prenom, p?.nom].filter(Boolean).join(" ") || "—"

/** Minutes écoulées, ou durée totale si la séance est close. */
function minutes(s: Seance): number {
  if (!s.demarree_le) return 0
  const fin = s.terminee_le ? new Date(s.terminee_le) : new Date()
  return Math.max(0, Math.round((fin.getTime() - new Date(s.demarree_le).getTime()) / 60000))
}

/**
 * Les séances.
 *
 * Une grille de cadres ne montrait qu'un identifiant tronqué : on savait
 * qu'une séance existait, pas qui s'y trouvait. Or c'est précisément la
 * question qu'on se pose ici — avec qui cet enfant travaille-t-il en ce
 * moment.
 */
export default async function PageSeances({
  params,
  searchParams,
}: {
  params: Promise<{ langue: string }>
  searchParams: Promise<{ filtre?: string }>
}) {
  const { langue: brut } = await params
  const { filtre = "en_cours" } = await searchParams
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.seances

  await exigerAdmin(langue)

  const enCoursSeul = filtre !== "toutes"
  const { donnees: seances } = await api<{ donnees: Seance[] }>(
    `/v1/admin/seances?enCours=${enCoursSeul}&limite=80`,
  )

  const rangee = (
    <Filtres
      base={chemin(langue, "/admin/seances")}
      parametre="filtre"
      actuel={enCoursSeul ? "en_cours" : "toutes"}
      etiquette={t.etiquette}
      options={[
        { valeur: "en_cours", libelle: t.seulementEnCours },
        { valeur: "toutes", libelle: t.toutes },
      ]}
    />
  )

  if (seances.length === 0) {
    return (
      <>
        <EnteteAdmin
        retourVers={chemin(langue, "/admin")} etiquette={t.etiquette} titre={t.vide} />
        <div className="px-5 sm:px-7">{rangee}</div>
        <RienEncore titre={t.vide} detail={t.videDetail} />
      </>
    )
  }

  return (
    <>
      <EnteteAdmin
        etiquette={t.etiquette}
        titre={
          enCoursSeul
            ? `${seances.length} ${pluriel(langue, seances.length, t.enCours)}`
            : `${seances.length} ${pluriel(langue, seances.length, t.tenues)}`
        }
      />

      <div className="px-5 pb-7 sm:px-7">
        {rangee}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seances.map((s) => {
            const active = !s.terminee_le && s.demarree_le
            const n = minutes(s)
            return (
              <Link
                key={s.id}
                href={chemin(langue, `/admin/seances/${s.id}`)}
                className="carte flex flex-col gap-3 p-4 transition hover:opacity-80"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-medium">
                    {s.matiere ? (d.matieres[s.matiere] ?? s.matiere) : "—"}
                  </span>
                  {active ? (
                    <span
                      className="h-[7px] w-[7px] shrink-0 rounded-full"
                      style={{ background: "var(--voyant)" }}
                      aria-hidden
                    />
                  ) : null}
                </div>

                {/* Qui est là. C'est la seule chose qui compte sur un écran
                    de surveillance : un identifiant ne dit rien de personne. */}
                <div className="flex items-center gap-2">
                  <Avatar
                    nom={nomDe(s.eleve)}
                    photoUrl={s.eleve?.photo_url ?? null}
                    taille={26}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">
                    {nomDe(s.eleve)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar
                    nom={nomDe(s.repetiteur)}
                    photoUrl={s.repetiteur?.photo_url ?? null}
                    taille={26}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">
                    {nomDe(s.repetiteur)}
                  </span>
                </div>

                <span className="doux text-[11.5px]">
                  {active
                    ? remplir(t.enCoursDepuis, { n })
                    : remplir(t.duree, { n })}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
