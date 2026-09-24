import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"
import { Liste, type Signalement } from "./liste"

/**
 * Les signalements.
 *
 * Ils s'écrivaient depuis le premier jour et personne ne pouvait les lire :
 * ni route, ni écran. Un parent alertait sur une séance, la plateforme
 * alertait au dixième rattachement refusé — et ça tombait dans une table que
 * rien n'ouvrait.
 *
 * Sur un produit dont la promesse est la protection des enfants, une alarme
 * que personne n'entend est pire que pas d'alarme : elle donne l'illusion
 * d'une surveillance.
 */
export default async function PageSignalements({
  params,
  searchParams,
}: {
  params: Promise<{ langue: string }>
  searchParams: Promise<{ statut?: string }>
}) {
  const { langue: brut } = await params
  const { statut = "nouveau" } = await searchParams
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.signalements

  await exigerAdmin(langue)

  let liste: Signalement[] = []
  try {
    const rep = await api<{ donnees: Signalement[] }>(
      `/v1/admin/signalements?statut=${statut === "tous" ? "tous" : statut}`,
    )
    liste = rep.donnees ?? []
  } catch {
    liste = []
  }

  const nouveaux = liste.filter((s) => s.statut === "nouveau").length

  return (
    <>
      <EnteteAdmin
        retourVers={chemin(langue, "/admin")}
        etiquette={t.etiquette}
        titre={
          nouveaux === 0
            ? t.titreCalme
            : pluriel(langue, nouveaux, t.titreAttend)
        }
      />

      <div className="max-w-2xl px-5 pb-7 sm:px-7">
        <p className="doux text-[13px] leading-relaxed">{t.intro}</p>

        {liste.length === 0 ? (
          <RienEncore titre={t.aucunTitre} detail={t.aucunDetail} />
        ) : (
          <Liste langue={langue} signalements={liste} />
        )}
      </div>
    </>
  )
}
