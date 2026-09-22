"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { chemin, langueDeFormulaire } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"

/**
 * Démarre une séance et y dépose la première réplique du tuteur.
 *
 * Cette réplique est écrite ici, pas générée par le modèle : elle est toujours
 * la même (§5 du prompt — « le tuteur demande ce qui a été fait en classe »).
 * L'écrire en dur évite un appel payant par séance et garantit une ouverture
 * instantanée, sans attente au chargement.
 */
export async function demarrerSeance(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const tuteurId = String(donnees.get("tuteurId") ?? "")
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  // La RLS garantit qu'on ne peut démarrer une séance que sur son propre tuteur.
  const { data: tuteur } = await supabase
    .from("tuteurs_ia")
    .select("id, matiere")
    .eq("id", tuteurId)
    .single()

  if (!tuteur) redirect(chemin(langue, "/tuteur"))

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom")
    .eq("id", user.id)
    .single()

  const { data: seance, error } = await supabase
    .from("seances")
    .insert({ tuteur_id: tuteur.id, mode: "texte" })
    .select("id")
    .single()

  if (error || !seance) redirect(chemin(langue, "/tuteur"))

  await supabase.from("messages").insert({
    seance_id: seance.id,
    auteur: "tuteur",
    contenu: `Salut ${profil?.prenom ?? ""} 👋 Alors, qu'est-ce que vous avez fait en ${tuteur.matiere.toLowerCase()} aujourd'hui ?`,
  })

  revalidatePath("/tuteur", "layout")
  redirect(`/seance/${seance.id}`)
}

export async function terminerSeance(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const seanceId = String(donnees.get("seanceId") ?? "")
  const supabase = await supabaseServeur()

  await supabase
    .from("seances")
    .update({ statut: "terminee", terminee_le: new Date().toISOString() })
    .eq("id", seanceId)

  revalidatePath("/tuteur", "layout")
  redirect(chemin(langue, "/tuteur"))
}
