"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { chemin, langueDeFormulaire } from "@/langues"
import { MATIERES, NIVEAUX } from "@/lib/referentiel"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatProfil = { erreur?: string; info?: string }

export async function enregistrerProfil(
  _precedent: EtatProfil,
  donnees: FormData,
): Promise<EtatProfil> {
  const langue = langueDeFormulaire(donnees)
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  const matieres = donnees
    .getAll("matieres")
    .map(String)
    .filter((m): m is (typeof MATIERES)[number] =>
      (MATIERES as readonly string[]).includes(m),
    )

  const niveaux = donnees
    .getAll("niveaux")
    .map(String)
    .filter((n): n is (typeof NIVEAUX)[number] =>
      (NIVEAUX as readonly string[]).includes(n),
    )

  if (matieres.length === 0) {
    return { erreur: "Indiquez au moins une matière." }
  }
  if (niveaux.length === 0) {
    return { erreur: "Indiquez au moins un niveau." }
  }

  const tarif = Number(donnees.get("tarif_mensuel") ?? 0)
  if (!Number.isFinite(tarif) || tarif < 0 || tarif > 10_000_000) {
    return { erreur: "Le tarif mensuel n'est pas valide." }
  }

  const experience = Number(donnees.get("annees_experience") ?? 0)
  if (!Number.isFinite(experience) || experience < 0 || experience > 60) {
    return { erreur: "Le nombre d'années d'expérience n'est pas valide." }
  }

  // La RLS restreint la modification à sa propre fiche : pas besoin de filtrer
  // sur l'identifiant ici, mais on le fait quand même — deux serrures.
  const { error } = await supabase
    .from("repetiteurs")
    .update({
      bio: String(donnees.get("bio") ?? "").trim() || null,
      ville: String(donnees.get("ville") ?? "").trim() || null,
      matieres,
      niveaux,
      tarif_mensuel: tarif || null,
      annees_experience: experience || null,
      disponibilites_texte:
        String(donnees.get("disponibilites_texte") ?? "").trim() || null,
      maj_le: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) return { erreur: "L'enregistrement a échoué. Réessayez." }

  revalidatePath("/repetiteur/profil")
  return { info: "Profil enregistré." }
}
