"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { chemin, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"
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

  const niveaux = donnees
    .getAll("niveaux")
    .map(String)

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

  // L'identifiant n'est pas transmis : le service le tire de la session, et
  // la fiche modifiée est donc toujours celle de l'appelant. L'envoyer
  // permettrait de demander à modifier celle d'un autre — que la base
  // refuserait, mais autant ne pas poser la question.
  try {
    const { enAttente } = await api<{ ok: boolean; enAttente: boolean }>(
      "/v1/repetiteur/profil",
      {
        methode: "POST",
        corps: {
          bio: String(donnees.get("bio") ?? "").trim() || null,
          ville: String(donnees.get("ville") ?? "").trim() || null,
          matieres,
          niveaux,
          tarif_mensuel: tarif || null,
          annees_experience: experience || null,
          disponibilites_texte:
            String(donnees.get("disponibilites_texte") ?? "").trim() || null,
        },
      },
    )

    revalidatePath("/repetiteur/profil")

    // Le passage en attente de vérification mérite d'être dit : c'est le
    // moment où la fiche quitte les mains de son auteur.
    return {
      info: enAttente
        ? "Profil enregistré. Votre dossier part en vérification."
        : "Profil enregistré.",
    }
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut < 500) {
      return { erreur: erreur.message }
    }
    return { erreur: "L'enregistrement a échoué. Réessayez." }
  }
}
