"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { chemin, langueDeFormulaire } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatCreation = { erreur?: string }

/**
 * Crée un tuteur par matière choisie.
 *
 * « Une matière = un tuteur » (docs/SPEC_APPLICATION.md §2.2) : chaque tuteur
 * porte son propre programme et sa propre mémoire de l'élève. Un tuteur de
 * maths n'a rien à savoir des difficultés en physique.
 */
export async function creerTuteur(
  _precedent: EtatCreation,
  donnees: FormData,
): Promise<EtatCreation> {
  const langue = langueDeFormulaire(donnees)
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  const programmeIds = donnees.getAll("programmeId").map(String).filter(Boolean)
  const manuels = String(donnees.get("manuels") ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((titre) => ({ titre }))

  if (programmeIds.length === 0) {
    return { erreur: "Choisis au moins une matière." }
  }

  // On relit les programmes côté serveur : le client a pu envoyer n'importe
  // quel identifiant. Seuls les programmes publiés sont acceptés.
  const { data: programmes, error: erreurProgrammes } = await supabase
    .from("programmes")
    .select("id, niveau, matiere")
    .in("id", programmeIds)
    .eq("publie", true)

  if (erreurProgrammes || !programmes || programmes.length === 0) {
    return { erreur: "Programme introuvable. Recommence." }
  }

  const { data: crees, error: erreurCreation } = await supabase
    .from("tuteurs_ia")
    .insert(
      programmes.map((p) => ({
        eleve_id: user.id,
        programme_id: p.id,
        matiere: p.matiere,
        niveau: p.niveau,
        manuels,
      })),
    )
    .select("id")

  if (erreurCreation || !crees) {
    return { erreur: "La création a échoué. Réessaie." }
  }

  // Mémoire vide : elle se remplira au fil des séances.
  await supabase
    .from("memoire_eleve")
    .insert(crees.map((t) => ({ tuteur_id: t.id })))

  revalidatePath("/", "layout")
  redirect(chemin(langue, "/tuteur"))
}
