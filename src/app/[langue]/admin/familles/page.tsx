import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Avatar } from "@/composants/avatar"
import {
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"

export default async function PageFamilles({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.familles

  const { supabase } = await exigerAdmin(langue)

  const [{ data: parents }, { data: liens }] = await Promise.all([
    supabase
      .from("profils")
      .select("id, prenom, nom, pays")
      .eq("role", "parent")
      .order("prenom"),
    supabase.from("liens_familiaux").select("parent_id, eleve_id"),
  ])

  const liste = parents ?? []

  const enfantsPar = new Map<string, number>()
  for (const l of liens ?? []) {
    enfantsPar.set(l.parent_id, (enfantsPar.get(l.parent_id) ?? 0) + 1)
  }

  if (liste.length === 0) {
    return (
      <>
        <EnteteAdmin etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} />
      </>
    )
  }

  return (
    <>
      <EnteteAdmin
        etiquette={t.etiquette}
        titre={`${liste.length} ${pluriel(langue, liste.length, t.compte).replace(`${liste.length} `, "")}`}
      />

      <div className="px-7 pb-7">
        {liste.map((p) => {
          const n = enfantsPar.get(p.id) ?? 0
          return (
            <div
              key={p.id}
              className="flex items-center gap-4 border-b py-3"
              style={{ borderColor: "var(--bordure)" }}
            >
              <Avatar
                nom={[p.prenom, p.nom].filter(Boolean).join(" ")}
                taille={30}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">
                  {[p.prenom, p.nom].filter(Boolean).join(" ")}
                </div>
                <div className="doux mt-0.5 text-[12px]">
                  {n === 0
                    ? t.aucunEnfant
                    : pluriel(langue, n, t.enfants)}
                </div>
              </div>
              {/* Une famille inscrite qui n'a jamais commencé est le signal
                  utile : c'est elle qu'il faut rappeler. */}
              <span className={n === 0 ? "badge-eteint" : "badge-verifie"}>
                {n === 0 ? t.aucuneSeance : pluriel(langue, n, t.enfants)}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
