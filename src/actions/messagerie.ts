"use server"

import { revalidatePath } from "next/cache"

import { dictionnaire, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"

export type EtatMessage = { erreur?: string }

/**
 * Écrire dans un fil.
 *
 * Rien ici ne vérifie qui écrit à qui : la politique de la base l'exige déjà
 * — on n'écrit que dans sa propre conversation, et en son propre nom. Le
 * refaire ici donnerait l'illusion que c'est ce code qui protège.
 */
export async function envoyerMessage(
  _precedent: EtatMessage,
  donnees: FormData,
): Promise<EtatMessage> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)

  const conversation = String(donnees.get("conversation") ?? "")
  const texte = String(donnees.get("texte") ?? "").trim()

  if (!conversation || !texte) return { erreur: d.messagerie.echec }

  try {
    await api(`/v1/messagerie/${conversation}`, {
      methode: "POST",
      corps: { texte },
    })
  } catch (erreur) {
    return {
      erreur:
        erreur instanceof ErreurApi ? erreur.message : d.messagerie.echec,
    }
  }

  revalidatePath("/", "layout")
  return {}
}
