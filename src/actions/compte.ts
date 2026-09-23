"use server"

import { revalidatePath } from "next/cache"

import { langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"

export type EtatCompte = { erreur?: string; info?: string }

/**
 * Enregistre l'identité et la photo.
 *
 * Le service normalise l'identifiant et refuse un doublon : on ne recopie pas
 * ces règles ici, sinon elles existeraient à deux endroits qui divergeront.
 */
export async function enregistrerCompte(
  _precedent: EtatCompte,
  donnees: FormData,
): Promise<EtatCompte> {
  const langue = langueDeFormulaire(donnees)
  const texte = (cle: string) => String(donnees.get(cle) ?? "").trim()

  try {
    await api("/v1/compte", {
      methode: "POST",
      corps: {
        prenom: texte("prenom"),
        nom: texte("nom"),
        telephone: texte("telephone"),
        identifiant: texte("identifiant"),
        photo_url: texte("photo_url"),
      },
    })

    revalidatePath("/", "layout")
    return { info: "ok" }
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut < 500) {
      return { erreur: erreur.message }
    }
    return { erreur: "service" }
  }
}

/**
 * Change le mot de passe.
 *
 * Le service exige l'actuel et le vérifie avant d'écrire. C'est ce qui
 * empêche quelqu'un trouvant une session ouverte de prendre le compte.
 */
export async function changerMotDePasse(
  _precedent: EtatCompte,
  donnees: FormData,
): Promise<EtatCompte> {
  const actuel = String(donnees.get("actuel") ?? "")
  const nouveau = String(donnees.get("nouveau") ?? "")

  if (nouveau.length < 8) return { erreur: "court" }

  try {
    await api("/v1/compte/mot-de-passe", {
      methode: "POST",
      corps: { actuel, nouveau },
    })
    return { info: "motDePasse" }
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut < 500) {
      return { erreur: erreur.message }
    }
    return { erreur: "service" }
  }
}
