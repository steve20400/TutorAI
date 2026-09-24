"use server"

import { chemin, dictionnaire, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export type EtatRattachement = { erreur?: string; info?: string }

/**
 * Demande à être rattaché à un enfant déjà inscrit.
 *
 * La réponse est toujours la même, que le compte existe ou non : c'est le
 * service qui garde ce silence, et l'écran doit le garder aussi. Dire « cet
 * enfant n'existe pas » transformerait ce champ en annuaire des enfants
 * inscrits.
 */
export async function demanderRattachement(
  _precedent: EtatRattachement,
  donnees: FormData,
): Promise<EtatRattachement> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const nom = String(donnees.get("nom") ?? "").trim()

  if (nom.length < 2) return { erreur: d.parent.rattacher.nomTropCourt }

  try {
    await api("/v1/liens/demande", { methode: "POST", corps: { nom } })
  } catch (e: unknown) {
    return {
      erreur: e instanceof ErreurApi ? e.message : d.parent.rattacher.echec,
    }
  }

  revalidatePath("/", "layout")
  return { info: d.parent.rattacher.envoyee }
}

/**
 * L'enfant reconnaît un adulte, ou non.
 *
 * Un refus ne se voit pas : la demande reste « en attente » du côté de
 * l'adulte, pour toujours. Refuser ne coûte donc rien à l'enfant, et celui qui
 * essaie n'obtient aucun signal qui lui dirait de s'y prendre autrement.
 */
export async function repondreAuRattachement(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const id = String(donnees.get("demande") ?? "")
  const oui = String(donnees.get("oui") ?? "") === "1"

  if (!id) return

  try {
    await api(`/v1/liens/${id}/reponse`, { methode: "POST", corps: { oui } })
  } catch {
    // Un échec ne doit pas bloquer l'enfant sur cet écran : la demande
    // restera en attente et lui sera reposée à sa prochaine visite.
  }

  revalidatePath("/", "layout")
  redirect(chemin(langue, "/"))
}
