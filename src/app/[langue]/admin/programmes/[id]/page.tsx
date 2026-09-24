import { notFound } from "next/navigation"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import { Lecons, type Lecon } from "./lecons"

type Reponse = {
  programme: {
    id: string
    pays: string
    niveau: string
    matiere: string
    publie: boolean
  }
  lecons: Lecon[]
}

/**
 * Les leçons d'un programme, et le moyen de les remplir.
 *
 * Le contenu officiel ne peut venir que de celui qui a le document sous les
 * yeux. Personne ne peut l'inventer à sa place — et surtout pas une machine :
 * de faux prérequis présentés à un enfant comme le programme de son pays
 * seraient pires que pas de programme du tout.
 */
export default async function PageProgramme({
  params,
}: {
  params: Promise<{ langue: string; id: string }>
}) {
  const { langue: brut, id } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.programmes

  await exigerAdmin(langue)

  let rep: Reponse | null = null
  try {
    rep = await api<Reponse>(`/v1/admin/programmes/${id}`)
  } catch {
    rep = null
  }

  if (!rep) notFound()

  const manquantes = rep.lecons.filter((l) => !l.renseignee).length

  return (
    <>
      <EnteteAdmin
        retourVers={chemin(langue, "/admin/programmes")}
        etiquette={`${rep.programme.matiere} — ${rep.programme.niveau}`}
        titre={
          manquantes === 0
            ? t.aucuneManquante
            : remplir(t.titre, { manquantes })
        }
      />

      <div className="max-w-2xl px-5 pb-7 sm:px-7">
        <p className="doux text-[13px] leading-relaxed">{t.intro}</p>
        <Lecons langue={langue} programme={rep.programme.id} lecons={rep.lecons} />
      </div>
    </>
  )
}
