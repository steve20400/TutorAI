"use server"

import { revalidatePath } from "next/cache"

import { dictionnaire, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"
import { exigerAdmin } from "@/lib/admin"

export type EtatTraitement = { erreur?: string; info?: string }

/**
 * Classe un signalement, avec sa raison.
 *
 * La raison est obligatoire. Un signalement classé sans un mot ne dit rien à
 * celui qui le relira dans six mois — et sur ce produit, quelqu'un le relira
 * peut-être pour comprendre ce qu'on savait et quand.
 */
export async function traiterSignalement(
  _precedent: EtatTraitement,
  donnees: FormData,
): Promise<EtatTraitement> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.adminPages.signalements

  const id = String(donnees.get("signalement") ?? "")
  const decision = String(donnees.get("decision") ?? "").trim()

  if (!id) return { erreur: t.echec }
  if (decision.length < 3) return { erreur: t.decisionObligatoire }

  await exigerAdmin(langue)

  try {
    await api(`/v1/admin/signalements/${id}/traiter`, {
      methode: "POST",
      corps: { decision },
    })
  } catch (e: unknown) {
    return { erreur: e instanceof ErreurApi ? e.message : t.echec }
  }

  revalidatePath("/", "layout")
  return { info: t.classe }
}

/**
 * Marque une alerte comme lue. Un clic, sans rien écrire.
 *
 * Lire n'est pas décider. Exiger un paragraphe pour dire « rien à signaler »
 * ferait qu'on ne les lit plus du tout — et la friction chasserait la lecture,
 * ce qui est le contraire du but.
 */
export async function marquerLue(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const id = String(donnees.get("signalement") ?? "")
  if (!id) return

  await exigerAdmin(langue)

  try {
    await api(`/v1/admin/signalements/${id}/lu`, { methode: "POST" })
  } catch {
    // Un échec ne doit pas bloquer la lecture des suivantes : l'alerte
    // restera « non lue » et reviendra.
  }

  revalidatePath("/", "layout")
}
