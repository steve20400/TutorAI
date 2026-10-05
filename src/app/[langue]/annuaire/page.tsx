import Link from "next/link"
import { redirect } from "next/navigation"

import { Coque } from "@/composants/coque"
import { Fiche, type Repetiteur } from "./fiche"
import { Filtres, Tri, type Etat, type Ville } from "./filtres"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
} from "@/langues"
import { api } from "@/lib/api"
import { lireReferentiel } from "@/lib/referentiel"

type Reponse = {
  donnees: Repetiteur[]
  pagination: { page: number; parPage: number; total: number; pages: number }
}

/**
 * L'annuaire des répétiteurs vérifiés.
 *
 * Deux mises en page, et c'est le canevas qui les donne : `Main.dc.html` pour
 * le grand écran — une barre de filtres de 238 px à gauche, les fiches à
 * droite — et `AnnuaireTel.dc.html` pour le téléphone, où les filtres se
 * replient en une bande de pastilles qui défile.
 *
 * Les filtres vivent dans l'adresse et non dans un état de composant : l'écran
 * reste servi, une recherche se partage par un lien, et le retour du
 * navigateur défait un filtre au lieu de quitter la page.
 *
 * Tout ce qui s'affiche vient de la base — les matières et les niveaux du
 * référentiel, les effectifs par ville et les bornes de prix de deux fonctions
 * dédiées. Rien n'est écrit en dur, pas même « de 0 à 100 000 F ».
 */
export default async function PageAnnuaire({
  params,
  searchParams,
}: {
  params: Promise<{ langue: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { langue: brut } = await params
  const sp = await searchParams
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.annuaire

  const etat: Etat = {
    ville: sp.ville || undefined,
    matiere: sp.matiere || undefined,
    niveau: sp.niveau || undefined,
    q: sp.q || undefined,
    prixMin: sp.prixMin ? Number(sp.prixMin) : undefined,
    prixMax: sp.prixMax ? Number(sp.prixMax) : undefined,
    experienceMin: sp.experienceMin ? Number(sp.experienceMin) : undefined,
    tri: sp.tri || undefined,
  }

  const numero = Math.max(1, Number(sp.page) || 1)
  const requete = new URLSearchParams({ page: String(numero), parPage: "20" })
  for (const [k, v] of Object.entries(etat)) {
    if (v !== undefined && v !== "") requete.set(k, String(v))
  }

  // Un enfant n'engage pas de répétiteur, et l'annuaire est une liste
  // d'adultes avec leurs photographies. On ne la lui ouvre pas : ce n'est pas
  // dangereux — ils sont vérifiés, et il ne peut écrire à personne — mais
  // cela ne lui sert à rien, et un écran qui ne sert à rien finit par servir à
  // autre chose.
  try {
    const moi = await api<{ role: string }>("/v1/moi")
    if (moi.role === "eleve") redirect(chemin(langue, "/"))
  } catch {
    // Pas de session, ou service muet : l'annuaire reste lisible.
  }

  const [reponse, referentiel, villes, bornes] = await Promise.all([
    api<Reponse>(`/v1/repetiteurs?${requete.toString()}`, {
      sansSession: true,
    }).catch(() => null),
    lireReferentiel(),
    api<{ donnees: Ville[] }>("/v1/repetiteurs/villes", { sansSession: true })
      .then((r) => r.donnees ?? [])
      .catch(() => [] as Ville[]),
    api<{ bas: number; haut: number }>("/v1/repetiteurs/bornes", {
      sansSession: true,
    }).catch(() => ({ bas: 0, haut: 0 })),
  ])

  const actifs = Object.values(etat).filter(
    (v) => v !== undefined && v !== "",
  ).length

  /** Une adresse identique, un filtre en plus ou en moins — pour la bande. */
  const avec = (cle: keyof Etat, valeur: string | null) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(etat)) {
      if (v !== undefined && v !== "") p.set(k, String(v))
    }
    if (valeur === null) p.delete(cle)
    else p.set(cle, valeur)
    const q = p.toString()
    return chemin(langue, `/annuaire${q ? `?${q}` : ""}`)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} villeActive={etat.ville} recherche={etat.q} />

      <div className="flex flex-1 gap-9 px-3 pb-10 pt-3.5 lg:px-[30px] lg:pt-[26px]">
        {/* La barre de filtres : grand écran seulement. */}
        <div className="hidden lg:block">
          <Filtres
            etat={etat}
            villes={villes}
            matieres={referentiel.matieres}
            niveaux={referentiel.niveaux}
            bornes={{ min: bornes.bas, max: bornes.haut }}
            langue={langue}
            d={d}
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Sur téléphone, les filtres deviennent une bande de pastilles.

              Elle défile horizontalement — le seul endroit de l'application
              où c'est voulu. Une bande se lit comme telle, et tronquer la
              liste cacherait des matières. La page, elle, ne défile jamais de
              côté. */}
          <div
            className="-mx-3 mb-3 overflow-x-auto px-3 pb-1 lg:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex w-max gap-1.5">
              <Link
                href={chemin(langue, "/annuaire")}
                className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
                style={
                  actifs > 0
                    ? {
                        borderColor: "var(--voyant)",
                        background: "var(--voyant)",
                        color: "#fff",
                      }
                    : { borderColor: "var(--bordure)" }
                }
              >
                {actifs > 0 ? `${t.filtres} · ${actifs}` : t.tousLesFiltres}
              </Link>

              {referentiel.matieres.map((m) => (
                <Link
                  key={`m-${m}`}
                  href={avec("matiere", etat.matiere === m ? null : m)}
                  className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
                  style={{
                    borderColor:
                      etat.matiere === m ? "var(--accent)" : "var(--bordure)",
                    background:
                      etat.matiere === m
                        ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                        : "transparent",
                  }}
                >
                  {m}
                </Link>
              ))}

              {villes.map((v) => (
                <Link
                  key={`v-${v.ville}`}
                  href={avec("ville", etat.ville === v.ville ? null : v.ville)}
                  className="whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px]"
                  style={{
                    borderColor:
                      etat.ville === v.ville
                        ? "var(--accent)"
                        : "var(--bordure)",
                    background:
                      etat.ville === v.ville
                        ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                        : "transparent",
                  }}
                >
                  {v.ville}
                </Link>
              ))}
            </div>
          </div>

          {/* Le compte, en tête de colonne. */}
          {reponse ? (
            <div className="mb-3 flex items-baseline justify-between gap-3 lg:mb-4">
              <p className="doux m-0 text-[12.5px] lg:text-[14px]">
                <strong
                  className="font-medium"
                  style={{ color: "var(--texte)" }}
                >
                  {pluriel(langue, reponse.pagination.total, t.rail.compte)}
                </strong>
                {etat.ville ? ` ${t.aVille} ${etat.ville}` : ""}
                {", "}
                {t.rail.tousControles}
              </p>

              {/* Le tri du canevas. Deux ordres, et pas trois : « le mieux
                  noté » n'existe pas, il n'y a pas de notes. */}
              <Tri etat={etat} langue={langue} d={d} />
            </div>
          ) : null}

          {reponse === null ? (
            <p className="doux text-sm leading-relaxed">{t.muet}</p>
          ) : reponse.donnees.length === 0 ? (
            <p className="doux text-sm leading-relaxed">
              {actifs > 0 ? t.aucun : t.aucunDuTout}
            </p>
          ) : (
            reponse.donnees.map((r) => (
              <Link
                key={r.id}
                href={chemin(langue, `/annuaire/${r.id}`)}
                className="block transition hover:opacity-90"
              >
                <Fiche r={r} langue={langue} d={d} />
              </Link>
            ))
          )}

        </div>
      </div>
    </div>
  )
}
