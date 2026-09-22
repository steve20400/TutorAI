import Link from "next/link"

import { EnteteAdmin, RienEncore } from "@/composants/admin/entete"
import { Filtres } from "@/composants/admin/filtres"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
} from "@/langues"
import { exigerAdmin } from "@/lib/admin"

const FILTRES = ["tous", "en_attente", "verifie", "refuse"] as const

const COULEUR_STATUT: Record<string, string> = {
  verifie: "var(--accent-doux-texte)",
  en_attente: "var(--voyant)",
  refuse: "var(--erreur-texte)",
  brouillon: "var(--texte-doux)",
}

export default async function PageRepetiteurs({
  params,
  searchParams,
}: {
  params: Promise<{ langue: string }>
  searchParams: Promise<{ q?: string; filtre?: string }>
}) {
  const { langue: brut } = await params
  const { q = "", filtre = "tous" } = await searchParams
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.adminPages.repetiteurs

  const { supabase } = await exigerAdmin(langue)

  let requete = supabase
    .from("repetiteurs")
    .select("id, ville, matieres, statut")
    .order("maj_le", { ascending: false })

  if ((FILTRES as readonly string[]).includes(filtre) && filtre !== "tous") {
    requete = requete.eq("statut", filtre)
  }

  const { data: fiches } = await requete
  const liste = fiches ?? []

  const { data: profils } = await supabase
    .from("profils")
    .select("id, prenom, nom")
    .in("id", liste.length ? liste.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"])

  const nomDe = (id: string) => {
    const p = profils?.find((x) => x.id === id)
    return [p?.prenom, p?.nom].filter(Boolean).join(" ") || "—"
  }

  // La recherche porte sur le nom, la ville et les matières. Elle se fait ici
  // plutôt qu'en base : le volume reste petit des années, et une recherche en
  // base sur un nom joint demanderait une vue dédiée.
  const terme = q.trim().toLowerCase()
  const visibles = terme
    ? liste.filter((r) =>
        [
          nomDe(r.id),
          r.ville ?? "",
          ...(r.matieres ?? []).map((m: string) => d.matieres[m] ?? m),
        ]
          .join(" ")
          .toLowerCase()
          .includes(terme),
      )
    : liste

  return (
    <>
      <EnteteAdmin
        etiquette={t.etiquette}
        titre={remplir(pluriel(langue, visibles.length, t.fiches), {})}
      />

      <div className="px-7 pb-7">
        <form className="flex flex-wrap items-center gap-3" action="">
          <label className="champ flex min-w-[240px] flex-1 items-center gap-2.5 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="doux shrink-0" aria-hidden>
              <circle cx="8.6" cy="8.6" r="5.4" />
              <path d="M12.6 12.6 17 17" />
            </svg>
            <input
              name="q"
              defaultValue={q}
              placeholder={t.chercher}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
          </label>
          <input type="hidden" name="filtre" value={filtre} />
        </form>

        <Filtres
          base={chemin(langue, "/admin/repetiteurs")}
          parametre="filtre"
          actuel={filtre}
          autres={q ? { q } : {}}
          etiquette={t.etiquette}
          options={[
            { valeur: "tous", libelle: t.tous },
            { valeur: "en_attente", libelle: t.attente },
            { valeur: "verifie", libelle: t.verifies },
            { valeur: "refuse", libelle: t.refuses },
          ]}
        />

        {visibles.length === 0 ? (
          <div className="mt-6">
            <RienEncore titre={terme ? t.videRecherche : t.vide} />
          </div>
        ) : (
          // `table-fixed` répartissait les colonnes en pourcentages de la
          // largeur disponible : sur un téléphone, « État » se retrouvait
          // écrasé à quelques pixels et tronqué. Le tableau garde donc une
          // largeur plancher et c'est le conteneur qui défile — les marges
          // négatives laissent le défilement aller jusqu'au bord de l'écran,
          // sinon la dernière colonne reste coincée sous le rembourrage.
          <div className="-mx-5 mt-5 overflow-x-auto px-5 sm:-mx-7 sm:px-7">
            <table className="w-full min-w-[560px] table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="doux text-[10px] font-semibold uppercase tracking-[0.12em]">
                <td className="w-[36%] pb-2">{t.colNom}</td>
                <td className="w-[20%] pb-2">{t.colVille}</td>
                <td className="w-[26%] pb-2">{t.colMatieres}</td>
                <td className="pb-2 text-right">{t.colEtat}</td>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--bordure)" }}
                >
                  <td className="truncate py-2.5 font-medium">{nomDe(r.id)}</td>
                  <td className="doux truncate py-2.5">{r.ville ?? "—"}</td>
                  <td className="doux truncate py-2.5">
                    {(r.matieres ?? [])
                      .map((m: string) => d.matieres[m] ?? m)
                      .join(", ") || "—"}
                  </td>
                  <td
                    className="py-2.5 text-right"
                    style={{ color: COULEUR_STATUT[r.statut] }}
                  >
                    {d.repetiteurProfil.statuts[
                      r.statut as keyof typeof d.repetiteurProfil.statuts
                    ]?.titre ?? r.statut}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
