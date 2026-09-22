import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import {
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"

export default async function PageSeances({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.seances

  const { supabase } = await exigerAdmin(langue)

  const { data: seances } = await supabase
    .from("seances_humaines")
    .select("id, demarree_le, terminee_le")
    .not("demarree_le", "is", null)
    .is("terminee_le", null)

  const enCours = seances ?? []

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
