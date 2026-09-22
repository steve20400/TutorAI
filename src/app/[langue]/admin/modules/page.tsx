import Link from "next/link"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { lireParametres } from "@/lib/parametres"
import { MODULES } from "@/lib/modules"

export default async function PageModules({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.modules

  await exigerAdmin(langue)
  const parametres = await lireParametres()

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={d.admin.modules} />

      <div className="px-5 sm:px-7 pb-7">
        {MODULES.map((cle) => {
          const actif = parametres[cle]
          const textes = d.admin.interrupteurs[cle]
          return (
            <Link
              key={cle}
              href={chemin(langue, `/admin/modules/${cle}`)}
              className="flex items-center gap-4 border-b py-4 transition hover:opacity-80"
              style={{ borderColor: "var(--bordure)" }}
            >
              {/* Le liseré dit l'état avant même qu'on lise la ligne. */}
              <span
                className="h-[30px] w-[3px] shrink-0 rounded-full"
                style={{
                  background: actif
                    ? "var(--accent-doux-texte)"
                    : "var(--bordure)",
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {textes.titre}
                </span>
                <span className="doux mt-0.5 block truncate text-[12px]">
                  {textes.detail}
                </span>
              </span>
              <span
                className="shrink-0 text-[11px] font-bold tracking-[0.09em]"
                style={{
                  color: actif
                    ? "var(--accent-doux-texte)"
                    : "var(--texte-doux)",
                }}
              >
                {actif ? t.enMarche : t.eteint}
              </span>
              <span className="doux shrink-0 text-[16px]">›</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
