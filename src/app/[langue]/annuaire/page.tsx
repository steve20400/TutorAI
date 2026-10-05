import Link from "next/link"
import { redirect } from "next/navigation"

import { Coque } from "@/composants/coque"
import { Fiche, type Repetiteur } from "./fiche"
import { BandePastilles, Filtres, Tri, type Etat, type Ville } from "./filtres"
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

  // Ce qui attend l'adulte, et qui ne doit pas se perdre.
  //
  // Il atterrit ici en se connectant : son ancien accueil ne portait que deux
  // cartes, et il en repartait aussitôt. Mais ces cartes-là pressent — une
  // demande de mot de passe d'enfant ne vaut qu'une heure. Elle s'annonce
  // donc au-dessus de l'annuaire plutôt que d'attendre derrière un menu.
  let demandesMdp = 0
  let estParent = false

  // Un enfant n'engage pas de répétiteur, et l'annuaire est une liste
  // d'adultes avec leurs photographies. On ne la lui ouvre pas : ce n'est pas
  // dangereux — ils sont vérifiés, et il ne peut écrire à personne — mais
  // cela ne lui sert à rien, et un écran qui ne sert à rien finit par servir à
  // autre chose.
  try {
    const moi = await api<{ role: string }>("/v1/moi")
    if (moi.role === "eleve") redirect(chemin(langue, "/"))
    estParent = moi.role === "parent"
  } catch {
    // Pas de session, ou service muet : l'annuaire reste lisible.
  }

  if (estParent) {
    try {
      const r = await api<{ donnees: { fermee: boolean }[] }>(
        "/v1/liens/mots-de-passe",
      )
      demandesMdp = (r.donnees ?? []).filter((x) => !x.fermee).length
    } catch {
      demandesMdp = 0
    }
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

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} villeActive={etat.ville} recherche={etat.q} />

      <div className="flex flex-1 gap-9 px-3 pb-10 pt-3.5 lg:px-[30px] lg:pt-[26px]">
        {/* La barre de filtres : grand écran seulement, et elle ne défile pas.
            Elle suivait la liste. Avec quarante répétiteurs on descendait
            loin, et il fallait tout remonter pour changer un filtre — alors
            que c'est en lisant les fiches qu'on se dit « finalement, plutôt
            Douala ». Elle reste donc en place, et seule la liste défile.

            Bornée en hauteur et défilante pour elle-même : sur un portable de
            720 points, la barre entière ne tient pas, et une barre figée dont
            le bas est inatteignable est pire qu'une barre qui défile. */}
        <div className="hidden lg:block">
          <div className="sticky top-[26px] max-h-[calc(100dvh-52px)] overflow-y-auto overscroll-contain pr-1">
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
        </div>

        <div className="min-w-0 flex-1">
          {demandesMdp > 0 ? (
            <Link
              href={chemin(langue, "/parent/mots-de-passe")}
              className="carte mb-3 block p-4 transition hover:opacity-90 lg:mb-4"
              style={{ borderColor: "var(--accent)" }}
            >
              <div className="text-[14px] font-medium">
                {d.recuperation.lienDepuisAccueil}
              </div>
              <p className="doux mt-1 text-[12px] leading-relaxed">
                {d.recuperation.pageDetail}
              </p>
            </Link>
          ) : null}

          <BandePastilles
            etat={etat}
            villes={villes}
            matieres={referentiel.matieres}
            niveaux={referentiel.niveaux}
            langue={langue}
            d={d}
          />

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
