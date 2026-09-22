import Link from "next/link"
import { notFound } from "next/navigation"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { lireParametres } from "@/lib/parametres"
import { basculerParametre, changerResolution } from "@/actions/admin"
import { MODULES, type CleModule } from "@/lib/modules"

/**
 * Modules qui ne peuvent pas s'allumer sans qu'une clé soit enregistrée.
 * L'interrupteur reste grisé tant qu'elle manque — et l'action serveur refuse
 * aussi, parce qu'un bouton désactivé ne protège que l'interface.
 */
const CLE_REQUISE: Partial<Record<CleModule, string>> = {
  ia_active: "anthropic",
  paiement_actif: "mobile_money",
}

const RESOLUTIONS = ["360p", "480p", "720p"] as const

export default async function PageModule({
  params,
}: {
  params: Promise<{ langue: string; cle: string }>
}) {
  const { langue: brut, cle: cleBrute } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.modules

  if (!(MODULES as readonly string[]).includes(cleBrute)) notFound()
  const cle = cleBrute as CleModule

  await exigerAdmin(langue)
  const parametres = await lireParametres()

  const actif = parametres[cle]
  const textes = d.admin.interrupteurs[cle]

  // Aucune clé n'est encore stockée : la table viendra avec le module de
  // paiement. En attendant, tout module qui en exige une reste bloqué — ce qui
  // est le comportement voulu, pas un manque.
  const cleManquante = CLE_REQUISE[cle] !== undefined

  return (
    <>
      <div className="px-5 sm:px-7 pt-7">
        <Link
          href={chemin(langue, "/admin/modules")}
          className="doux text-[12px] hover:underline"
        >
          ‹ {t.retour}
        </Link>
      </div>

      <EnteteAdmin etiquette={d.admin.modules} titre={textes.titre}>
        <span className={actif ? "badge-verifie" : "badge-eteint"}>
          {actif ? t.enMarche : t.eteint}
        </span>
      </EnteteAdmin>

      <div className="flex max-w-2xl flex-col gap-5 px-5 sm:px-7 pb-7">
        <p className="doux text-[13px] leading-relaxed">{textes.detail}</p>

        {cle === "enregistrement_actif" ? (
          <section className="carte p-5">
            <div className="text-[14px] font-medium">{t.resolutionTitre}</div>
            <p className="doux mt-1 text-[12px] leading-relaxed">
              {d.admin.resolutionDetail}
            </p>
            <form action={changerResolution} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="langue" value={langue} />
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  type="submit"
                  name="resolution"
                  value={r}
                  className={
                    parametres.resolution_video === r ? "bt1" : "bt2"
                  }
                >
                  {r}
                </button>
              ))}
            </form>
          </section>
        ) : null}

        {cleManquante ? (
          <section className="carte p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-medium">
                {t.cleAnthropique}
              </span>
              <span className="badge-eteint">{t.nonRenseignee}</span>
            </div>
            <p className="doux mt-2 text-[12px] leading-relaxed">
              {t.jamaisRelue}
            </p>
          </section>
        ) : null}

        <form
          action={basculerParametre}
          className="flex flex-wrap items-center gap-4 border-t pt-5"
          style={{ borderColor: "var(--bordure)" }}
        >
          <input type="hidden" name="langue" value={langue} />
          <input type="hidden" name="cle" value={cle} />
          <input type="hidden" name="valeur" value={String(!actif)} />

          <div className="min-w-[160px] flex-1">
            <div className="text-[13px] font-medium">
              {actif ? t.eteindre : t.allumer}
            </div>
            {cleManquante && !actif ? (
              <div className="doux mt-0.5 text-[12px]">
                {t.impossibleSansCle}
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={cleManquante && !actif}
            className={actif ? "bt2" : "bt1"}
          >
            {actif ? d.admin.eteindre : d.admin.activer}
          </button>
        </form>

        <p className="doux text-[12px] leading-relaxed">{d.admin.journal}</p>
      </div>
    </>
  )
}
