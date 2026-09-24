import { redirect } from "next/navigation"
import Link from "next/link"
import { ReglagesRapides } from "@/composants/reglages-rapides"

import { BoutonDeconnexion } from "@/composants/deconnexion"
import { Registre } from "@/composants/registre"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  pluriel,
  remplir,
} from "@/langues"
import { api } from "@/lib/api"
import { Enfants, type Enfant } from "./enfants"
import { Rattacher } from "./rattacher"
import { supabaseServeur } from "@/lib/supabase/server"

/**
 * Accueil parent — volontairement minimal à ce stade.
 *
 * L'annuaire et le suivi des enfants arrivent aux étapes 3 et 4. Cet écran
 * existe pour qu'un parent qui se connecte atterrisse quelque part de sensé
 * plutôt que sur l'espace élève ou une page introuvable.
 */
export default async function AccueilParent({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  const profil = await api<{ prenom: string | null; role: string }>("/v1/moi")

  if (profil.role !== "parent") redirect(chemin(langue, "/"))

  // L'annuaire compte les fiches que ce parent peut réellement voir : la
  // politique écarte déjà les non vérifiées, les impayées et les comptes
  // désactivés. Compter en direct donnerait un nombre plus grand que la liste
  // qui suit — et un écart entre les deux se lit comme un bug.
  // Une demande de mot de passe rend un enfant dépendant de son parent : il
  // ne peut rien faire d'autre qu'attendre, et elle ne vaut que dix minutes.
  // Elle s'annonce donc en tête, pas au fond d'une rubrique.
  let demandesMdp = 0
  try {
    const rep = await api<{ donnees: { fermee: boolean }[] }>(
      "/v1/liens/mots-de-passe",
    )
    demandesMdp = (rep.donnees ?? []).filter((d) => !d.fermee).length
  } catch {
    demandesMdp = 0
  }

  const { pagination } = await api<{ pagination: { total: number } }>(
    "/v1/repetiteurs?parPage=1",
  )
  const verifies = pagination.total

  // Les enfants viennent du service Tuteurs, qui retransmet le jeton à
  // Postgres : la politique de `liens_familiaux` ne renvoie que ceux de
  // l'appelant, donc aucun filtre à écrire ici — ni à oublier.
  //
  // Une panne du service ne doit pas emporter la page entière : le reste de
  // l'espace parent, l'annuaire compris, n'en dépend pas.
  let enfants: Enfant[] = []
  let serviceMuet = false
  try {
    const rep = await api<{ donnees: Enfant[] }>("/v1/enfants")
    enfants = rep.donnees
  } catch {
    serviceMuet = true
  }

  return (
    <Registre>
      <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">
              {remplir(d.parent.bonjour, { prenom: profil.prenom ?? "" })}
            </h1>
            <p className="doux mt-0.5 text-sm">{d.parent.espace}</p>
          </div>
          <ReglagesRapides />
          <BoutonDeconnexion langue={langue} />
        </header>

        {demandesMdp > 0 ? (
          <Link
            href={chemin(langue, "/parent/mots-de-passe")}
            className="carte block p-5 transition hover:opacity-90"
            style={{ borderColor: "var(--accent)" }}
          >
            <div className="font-medium">{d.recuperation.lienDepuisAccueil}</div>
            <p className="doux mt-1 text-sm leading-relaxed">
              {d.recuperation.pageDetail}
            </p>
          </Link>
        ) : null}

        <section className="carte p-5">
          <div className="font-medium">{d.parent.trouverRepetiteur}</div>
          <p className="doux mt-1 text-sm leading-relaxed">
            {verifies > 0
              ? pluriel(langue, verifies, d.parent.compteRepetiteurs)
              : d.parent.aucunRepetiteur}
          </p>
          <div className="doux mt-3 text-xs uppercase tracking-wide">
            {d.parent.annuaireEtape}
          </div>
        </section>

        <Rattacher />

        <Enfants
          langue={langue}
          d={d}
          enfants={enfants}
          serviceMuet={serviceMuet}
        />
      </main>
    </Registre>
  )
}
