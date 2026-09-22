import Link from "next/link"

import { CarteCouverture } from "@/composants/admin/carte"
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

  const [attente, verifies, familles, enCours, villes] = await Promise.all([
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
    supabase
      .from("villes")
      .select("nom, x, y")
      .eq("visible", true)
      .order("nom"),
  ])

  const aVerifier = attente.count ?? 0
  const nbFamilles = familles.count ?? 0
  const nbEnCours = enCours.count ?? 0

  const ouvertes = (villes.data ?? []) as { nom: string; x: number; y: number }[]

  // Répartition par ville, calculée ici : la base ne sait pas regrouper sans
  // vue dédiée, et le volume reste minuscule pendant des années.
  const parVille = new Map<string, number>()
  for (const r of verifies.data ?? []) {
    const ville = (r.ville ?? "").trim()
    if (ville) parVille.set(ville, (parVille.get(ville) ?? 0) + 1)
  }

  // Le titre dit ce que la page raconte aujourd'hui, pas le nom de la rubrique.
  //
  // La ville nommée est une ville RÉELLEMENT ouverte et réellement vide. Tant
  // qu'aucune ville n'est ouverte, annoncer qu'il en manque dans l'une d'elles
  // serait une phrase inventée : la carte n'aurait rien à montrer.
  const vides = ouvertes.filter((v) => !parVille.get(v.nom))
  const titre =
    ouvertes.length === 0 || parVille.size === 0
      ? t.titreVide
      : vides.length > 0
        ? remplir(t.titreCouverture, { ville: vides[0]!.nom })
        : t.titreCalme

  return (
    <>
      <EnteteAdmin etiquette={t.etiquette} titre={titre} />

      {/* Sous le point de rupture la carte passe en dernier : elle a besoin de
          toute la largeur, et les chiffres qui appellent une action doivent
          rester au-dessus de la ligne de flottaison. */}
      <div className="flex flex-col gap-4 px-5 pb-7 sm:px-7 lg:grid lg:grid-cols-[1.45fr_1fr] lg:items-start">
        <section className="carte order-last flex flex-col gap-3 p-4 sm:p-5 lg:order-first">
          <div className="doux text-[11px] font-semibold uppercase tracking-[0.16em]">
            {t.couverture}
          </div>

          <div className="min-h-[230px] flex-1 sm:min-h-[300px]">
            <CarteCouverture
              villes={ouvertes}
              parVille={parVille}
              legendeVide={t.aucuneVille}
            />
          </div>

          <p className="doux text-[12px] leading-relaxed">
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
