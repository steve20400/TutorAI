import Link from "next/link"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

type Avancement = {
  id: string
  pays: string
  niveau: string
  matiere: string
  publie: boolean
  lecons: number
  renseignees: number
}

/**
 * Les programmes officiels, et ce qu'il reste à saisir.
 *
 * C'est l'écran le plus important de l'administration, et il n'existait pas.
 * L'ancrage au programme est ce qui distingue ce tuteur d'un robot bavard —
 * or sur les douze leçons du programme ivoirien, UNE SEULE porte ses
 * compétences. Le tuteur travaille donc à l'aveugle sur les onze autres, et
 * rien nulle part ne le disait.
 *
 * Une barre par programme : on voit le chantier, et on voit s'il avance.
 */
export default async function PageProgrammes({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.programmes

  await exigerAdmin(langue)

  let liste: Avancement[] = []
  try {
    const rep = await api<{ donnees: Avancement[] }>("/v1/admin/programmes")
    liste = rep.donnees ?? []
  } catch {
    liste = []
  }

  return (
    <>
      <EnteteAdmin
        retourVers={chemin(langue, "/admin")}
        etiquette={t.etiquette}
        titre={
          liste.length === 0
            ? t.aucunTitre
            : remplir(t.titre, {
                manquantes: liste.reduce(
                  (n, p) => n + (p.lecons - p.renseignees),
                  0,
                ),
              })
        }
      />

      <div className="max-w-2xl px-5 pb-7 sm:px-7">
        <p className="doux text-[13px] leading-relaxed">{t.intro}</p>

        {liste.length === 0 ? (
          <RienEncore titre={t.aucunTitre} detail={t.aucunDetail} />
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {liste.map((p) => {
              const part =
                p.lecons === 0 ? 0 : Math.round((p.renseignees / p.lecons) * 100)

              return (
                <Link
                  key={p.id}
                  href={chemin(langue, `/admin/programmes/${p.id}`)}
                  className="carte block p-4 transition hover:opacity-90"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-medium">
                      {p.matiere} — {p.niveau}
                    </span>
                    <span className={p.publie ? "badge-actif" : "badge-eteint"}>
                      {p.publie ? t.publie : t.brouillon}
                    </span>
                  </div>

                  <div className="doux mt-1 text-[12px]">
                    {d.tuteur.pays[p.pays] ?? p.pays}
                  </div>

                  {/* La barre dit l'état du chantier d'un coup d'œil. Un
                      programme à une leçon sur douze n'est pas « presque
                      prêt », et le chiffre seul ne le crie pas assez. */}
                  <div
                    className="mt-3 h-[6px] w-full overflow-hidden rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--texte) 9%, transparent)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${part}%`,
                        background:
                          part === 100 ? "var(--verifie)" : "var(--accent)",
                      }}
                    />
                  </div>

                  <div className="doux mt-1.5 text-[12px]">
                    {remplir(t.avancement, {
                      faites: p.renseignees,
                      total: p.lecons,
                    })}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
