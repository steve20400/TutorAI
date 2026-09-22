import { redirect } from "next/navigation"

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
import { Enfants, type Enfant } from "./enfants"
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

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom, role")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "parent") redirect(chemin(langue, "/"))

  const { count } = await supabase
    .from("repetiteurs")
    .select("id", { count: "exact", head: true })
    .eq("statut", "verifie")

  const verifies = count ?? 0

  // Les enfants rattachés. La politique de `liens_familiaux` ne renvoie que
  // ceux de l'appelant : pas de filtre à écrire ici, et surtout pas à oublier.
  const { data: liens } = await supabase
    .from("liens_familiaux")
    .select("eleve_id")
    .eq("parent_id", user.id)

  const idsEnfants = (liens ?? []).map((l) => l.eleve_id as string)

  const { data: fichesEnfants } = idsEnfants.length
    ? await supabase
        .from("profils")
        .select("id, prenom, nom, identifiant")
        .in("id", idsEnfants)
        .order("prenom")
    : { data: [] as Enfant[] }

  return (
    <Registre>
      <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">
              {remplir(d.parent.bonjour, { prenom: profil.prenom })}
            </h1>
            <p className="doux mt-0.5 text-sm">{d.parent.espace}</p>
          </div>
          <BoutonDeconnexion langue={langue} />
        </header>

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

        <Enfants
          langue={langue}
          d={d}
          enfants={(fichesEnfants ?? []) as Enfant[]}
        />
      </main>
    </Registre>
  )
}
