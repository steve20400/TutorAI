import { EnteteAdmin } from "@/composants/admin/entete"
import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerAdmin } from "@/lib/admin"

/**
 * Les clés n'ont pas encore de table : elle viendra avec le module de
 * paiement, chiffrée. Cette page existe déjà pour dire ce qui manque et
 * pourquoi — un écran absent laisse croire à un oubli, un écran qui dit
 * « non renseignée » dit la vérité.
 */
const CLES = ["anthropic", "orange", "mtn"] as const

export default async function PageCles({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.cles

  await exigerAdmin(langue)

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={d.adminNav.cles} />

      <div className="max-w-2xl px-7 pb-7">
        <p className="doux text-[13px] leading-relaxed">{t.intro}</p>

        <div className="mt-5 flex flex-col gap-3">
          {CLES.map((c) => (
            <section key={c} className="carte p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14px] font-medium">{t[c]}</span>
                <span className="badge-eteint">
                  {d.adminPages.modules.nonRenseignee}
                </span>
              </div>
            </section>
          ))}
        </div>

        <p className="doux mt-5 text-[12px] leading-relaxed">
          {d.adminPages.modules.jamaisRelue}
        </p>
      </div>
    </>
  )
}
