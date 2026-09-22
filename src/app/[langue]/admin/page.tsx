import Link from "next/link"

import { EnteteAdmin } from "@/composants/admin/entete"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { lireParametres } from "@/lib/parametres"

export default async function TableauDeBord({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.tableauDeBord

  const { supabase } = await exigerAdmin(langue)
  const parametres = await lireParametres()

  const [attente, verifies, familles, enCours] = await Promise.all([
    supabase
      .from("repetiteurs")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en_attente"),
    supabase.from("repetiteurs").select("ville").eq("statut", "verifie"),
    supabase
      .from("profils")
      .select("id", { count: "exact", head: true })
      .eq("role", "parent"),
    supabase
      .from("seances_humaines")
      .select("id", { count: "exact", head: true })
      .not("demarree_le", "is", null)
      .is("terminee_le", null),
  ])

  const aVerifier = attente.count ?? 0
  const nbFamilles = familles.count ?? 0
  const nbEnCours = enCours.count ?? 0

  // Répartition par ville, calculée ici : la base ne sait pas regrouper sans
  // vue dédiée, et le volume reste minuscule pendant des années.
  const parVille = new Map<string, number>()
  for (const r of verifies.data ?? []) {
    const ville = (r.ville ?? "").trim()
    if (ville) parVille.set(ville, (parVille.get(ville) ?? 0) + 1)
  }
  const villes = [...parVille.entries()].sort((a, b) => b[1] - a[1])
  const maximum = villes[0]?.[1] ?? 1

  // Le titre dit ce que la page raconte aujourd'hui, pas le nom de la rubrique.
  const titre =
    villes.length === 0
      ? t.titreVide
      : aVerifier === 0
        ? t.titreCalme
        : remplir(t.titreCouverture, { ville: villes[villes.length - 1]![0] })

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={titre} />

      <div className="grid gap-4 px-7 pb-7 lg:grid-cols-[1.4fr_1fr]">
        <section className="carte flex flex-col gap-4 p-5">
          <div className="doux text-[11px] font-semibold uppercase tracking-[0.16em]">
            {t.couverture}
          </div>

          {villes.length === 0 ? (
            <p className="doux py-6 text-center text-[13px]">{t.aucuneVille}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {villes.map(([ville, n]) => (
                <div key={ville}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="font-medium">{ville}</span>
                    <span className="doux font-mono text-[12px]">{n}</span>
                  </div>
                  <div
                    className="mt-1.5 h-[4px] overflow-hidden rounded-full"
                    style={{ background: "var(--bordure)" }}
                  >
                    <i
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.round((n / maximum) * 100)}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="doux mt-auto pt-2 text-[12px] leading-relaxed">
            {nbFamilles} {pluriel(langue, nbFamilles, t.familles)}
          </p>
        </section>

        <div className="flex flex-col gap-4">
          <section className="carte p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-[38px] font-light leading-none tracking-[-0.04em]">
                {aVerifier}
              </span>
              <span className="text-[14px] leading-snug">
                {pluriel(langue, aVerifier, t.dossiersAttendent)}
              </span>
            </div>
            {aVerifier > 0 ? (
              <Link
                href={chemin(langue, "/admin/dossiers")}
                className="bt1 mt-4 w-full"
              >
                {t.ouvrirLePremier}
              </Link>
            ) : null}
          </section>

          <section className="carte p-5">
            <div className="flex items-center gap-2.5">
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{
                  background: nbEnCours > 0 ? "var(--voyant)" : "var(--bordure)",
                }}
              />
              <span className="text-[14px]">
                <b>{nbEnCours}</b>{" "}
                {pluriel(langue, nbEnCours, t.seancesEnDirect)}
              </span>
            </div>
            <p className="doux mt-1.5 text-[12px]">
              {parametres.enregistrement_actif
                ? remplir(t.enregistrementActif, {
                    resolution: parametres.resolution_video,
                  })
                : t.enregistrementEteint}
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
