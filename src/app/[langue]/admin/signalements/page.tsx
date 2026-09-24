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
import Link from "next/link"

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

  /** Non lues, lues, toutes. On arrive sur les non lues : c'est l'urgence. */
  const filtres = [
    { cle: "nouveau", libelle: t.filtreNonLues },
    { cle: "lu", libelle: t.filtreLues },
    { cle: "tous", libelle: t.filtreToutes },
  ] as const

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

        <nav className="rangee-filtres mt-4 flex gap-2 overflow-x-auto pb-1">
          {filtres.map((f) => (
            <Link
              key={f.cle}
              href={chemin(langue, `/admin/signalements?statut=${f.cle}`)}
              className={statut === f.cle ? "bt1 shrink-0 px-3 py-1.5 text-[12.5px]" : "bt2 shrink-0 px-3 py-1.5 text-[12.5px]"}
            >
              {f.libelle}
            </Link>
          ))}
        </nav>

        {liste.length === 0 ? (
          <RienEncore titre={t.aucunTitre} detail={t.aucunDetail} />
        ) : (
          <Liste langue={langue} signalements={liste} />
        )}
      </div>
    </>
  )
}
