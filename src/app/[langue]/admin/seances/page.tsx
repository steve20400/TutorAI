import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import {
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

type Seance = {
  id: string
  contrat_id: string
  demarree_le: string | null
  terminee_le: string | null
}

export default async function PageSeances({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.seances

  await exigerAdmin(langue)

  const { donnees: enCours } = await api<{ donnees: Seance[] }>(
    "/v1/seances?enCours=true",
  )

  if (enCours.length === 0) {
    return (
      <>
        <EnteteAdmin etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} detail={t.videDetail} />
      </>
    )
  }

  return (
    <>
      <EnteteAdmin
        etiquette={t.etiquette}
        titre={`${enCours.length} ${pluriel(langue, enCours.length, t.enCours)}`}
      />
      <div className="grid gap-3 px-5 sm:px-7 pb-7 sm:grid-cols-3 lg:grid-cols-4">
        {enCours.map((s) => (
          <div
            key={s.id}
            className="carte relative flex items-end p-3"
            style={{ aspectRatio: "4 / 3" }}
          >
            <span
              className="absolute right-3 top-3 h-[6px] w-[6px] rounded-full"
              style={{ background: "var(--voyant)" }}
            />
            <span className="doux font-mono text-[11px]">
              {s.id.slice(0, 8)}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
