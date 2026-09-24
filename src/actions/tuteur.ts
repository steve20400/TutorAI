"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { chemin, langueDeFormulaire } from "@/langues"
import { lireParametres } from "@/lib/parametres"
import { supabaseServeur } from "@/lib/supabase/server"
import { api, ErreurApi } from "@/lib/api"
import { dictionnaire } from "@/langues"

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
  const d = dictionnaire(langue)
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  // Troisième serrure, et la seule qui tienne : la page est gardée, le
  // formulaire n'est pas affiché, mais une action serveur s'appelle
  // directement. Un module éteint doit refuser ici aussi.
  const { ia_active } = await lireParametres()
  if (!ia_active) redirect(chemin(langue, "/"))

  const programmeIds = donnees.getAll("programmeId").map(String).filter(Boolean)

  // Les matières que l'élève a nommées lui-même, faute de programme officiel
  // chargé pour elles. Le niveau vient à part, puisque aucun programme ne le
  // porte.
  const niveauLibre = String(donnees.get("niveauLibre") ?? "").trim()
  const libres = donnees
    .getAll("matiereLibre")
    .map(String)
    .map((m) => m.trim())
    .filter((m) => m.length >= 2)
    .map((matiere) => ({ matiere, niveau: niveauLibre }))

  const manuels = String(donnees.get("manuels") ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((titre) => ({ titre }))

  if (programmeIds.length === 0 && libres.length === 0) {
    return { erreur: d.tuteur.choisisUneMatiere }
  }

  if (libres.length > 0 && !niveauLibre) {
    return { erreur: d.tuteur.choisisUneMatiere }
  }

  // Par le service, jamais en écrivant dans la base d'ici : c'est lui qui
  // relit les programmes, inscrit les matières nouvelles au catalogue et crée
  // la mémoire vide de chaque tuteur. Le site ne décide de rien.
  try {
    await api("/v1/tuteurs", {
      methode: "POST",
      corps: { programmeIds, libres, manuels },
    })
  } catch (e) {
    return {
      erreur:
        e instanceof ErreurApi ? e.message : d.tuteur.creationEchouee,
    }
  }

  revalidatePath("/", "layout")
  redirect(chemin(langue, "/tuteur"))
}
