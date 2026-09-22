import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerAdmin } from "@/lib/admin"

const COULEUR_ACTION: Record<string, string> = {
  verification: "var(--accent-doux-texte)",
  refus: "var(--erreur-texte)",
  activation: "var(--accent)",
  desactivation: "var(--texte-doux)",
}

export default async function PageRegistre({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.registre

  const { supabase } = await exigerAdmin(langue)

  const { data: lignes } = await supabase
    .from("journal_admin")
    .select("id, action, cible_type, cible_id, motif, cree_le, admin_id")
    .order("cree_le", { ascending: false })
    .limit(80)

  const liste = lignes ?? []

  if (liste.length === 0) {
    return (
      <>
        <EnteteAdmin etiquette={t.etiquette} titre={t.vide} />
        <RienEncore titre={t.vide} detail={t.videDetail} />
      </>
    )
  }

  const quand = (iso: string) =>
    new Date(iso).toLocaleString(langue, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={d.adminNav.registre} />

      <div className="relative px-7 pb-7 pl-12">
        <span
          className="absolute bottom-8 left-[34px] top-1 w-px"
          style={{ background: "var(--bordure)" }}
        />
        {liste.map((l) => (
          <div key={l.id} className="relative pb-5">
            <span
              className="absolute -left-[17px] top-1.5 h-[9px] w-[9px] rounded-full"
              style={{
                background: COULEUR_ACTION[l.action] ?? "var(--texte-doux)",
              }}
            />
            <div className="doux font-mono text-[11px]">
              {quand(l.cree_le)}
            </div>
            <div className="mt-0.5 text-[13px]">
              <b>{l.action}</b>
              {l.cible_id ? (
                <span className="doux"> — {l.cible_type} {l.cible_id}</span>
              ) : null}
            </div>
            {l.motif ? (
              <p className="doux mt-1 text-[12px] italic">{l.motif}</p>
            ) : null}
          </div>
        ))}
      </div>
    </>
  )
}
