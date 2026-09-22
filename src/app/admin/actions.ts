"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatAdmin = { erreur?: string; info?: string }

/**
 * Vérifie que l'appelant est bien administrateur, et renvoie son identifiant.
 *
 * Appelée au début de CHAQUE action d'administration. La politique RLS
 * `est_admin()` protège déjà les écritures ; ce contrôle en plus permet de
 * répondre proprement plutôt que de laisser passer une écriture silencieuse
 * qui n'affecte aucune ligne.
 */
async function exigerAdmin() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "admin") redirect("/")

  return { supabase, adminId: user.id }
}

/** Journalise toute action d'administration. Sans exception. */
async function journaliser(
  supabase: Awaited<ReturnType<typeof supabaseServeur>>,
  adminId: string,
  action: string,
  cible: string,
  motif?: string,
) {
  await supabase.from("journal_admin").insert({
    admin_id: adminId,
    action,
    cible_type: "parametre",
    cible_id: cible,
    motif: motif ?? null,
  })
}

const PARAMETRES_BOOLEENS = [
  "ia_active",
  "paiement_actif",
  "enregistrement_actif",
  "inscriptions_ouvertes",
] as const

export async function basculerParametre(donnees: FormData): Promise<void> {
  const cle = String(donnees.get("cle") ?? "")
  const valeur = String(donnees.get("valeur") ?? "") === "true"

  if (!(PARAMETRES_BOOLEENS as readonly string[]).includes(cle)) return

  const { supabase, adminId } = await exigerAdmin()

  await supabase
    .from("parametres")
    .update({ valeur, maj_le: new Date().toISOString(), maj_par: adminId })
    .eq("cle", cle)

  await journaliser(
    supabase,
    adminId,
    valeur ? "activation" : "desactivation",
    cle,
  )

  revalidatePath("/", "layout")
}

const RESOLUTIONS = ["360p", "480p", "720p"] as const

export async function changerResolution(donnees: FormData): Promise<void> {
  const valeur = String(donnees.get("resolution") ?? "")
  if (!(RESOLUTIONS as readonly string[]).includes(valeur)) return

  const { supabase, adminId } = await exigerAdmin()

  await supabase
    .from("parametres")
    .update({ valeur, maj_le: new Date().toISOString(), maj_par: adminId })
    .eq("cle", "resolution_video")

  await journaliser(supabase, adminId, "resolution", valeur)
  revalidatePath("/admin")
}
