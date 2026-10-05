"use server"

import { revalidatePath } from "next/cache"

import { redirect } from "next/navigation"

import { chemin, dictionnaire, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"

export type EtatProposition = { erreur?: string; info?: string }

/**
 * Le parent propose une séance à un répétiteur.
 *
 * « Propose », et non « engage ». Le contrat naît en attente : c'est le
 * répétiteur qui l'accepte ou le refuse, et tant qu'il n'a pas répondu, le
 * parent n'a rien d'autre qu'une demande. Lui dire le contraire reviendrait à
 * lui promettre un répétiteur qui n'a jamais dit oui.
 *
 * `parent_id` ne part pas d'ici : le service le prend dans la session. Le
 * laisser choisir permettrait d'engager un répétiteur au nom d'un autre.
 */
export async function proposerSeance(
  _precedent: EtatProposition,
  donnees: FormData,
): Promise<EtatProposition> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.annuaire.dossier

  const eleveId = String(donnees.get("eleve") ?? "")
  const repetiteurId = String(donnees.get("repetiteur") ?? "")
  const matiere = String(donnees.get("matiere") ?? "").trim()

  if (!eleveId || !repetiteurId || !matiere) {
    return { erreur: t.echecProposition }
  }

  try {
    await api("/v1/contrats", {
      methode: "POST",
      corps: { eleveId, repetiteurId, matiere },
    })
  } catch (erreur) {
    // 23505 : la même proposition existe déjà. Le dire plutôt qu'un échec
    // générique — le parent croirait que rien n'est parti et recommencerait.
    if (erreur instanceof ErreurApi && erreur.statut === 409) {
      return { erreur: t.dejaPropose }
    }
    return {
      erreur:
        erreur instanceof ErreurApi ? erreur.message : t.echecProposition,
    }
  }

  revalidatePath("/", "layout")
  return { info: t.envoyee }
}

/**
 * Le répétiteur accepte ou refuse.
 *
 * Son refus est dit au parent, contrairement à celui d'un enfant. Les raisons
 * diffèrent : un enfant qui refuse un adulte se protège de quelqu'un qui ne
 * devrait pas insister, et le silence le protège. Un répétiteur qui refuse un
 * élève n'a pas la disponibilité — le parent doit l'apprendre pour chercher
 * ailleurs, sinon il attend.
 */
export async function repondreProposition(
  _precedent: EtatProposition,
  donnees: FormData,
): Promise<EtatProposition> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const contrat = String(donnees.get("contrat") ?? "")
  const oui = donnees.get("reponse") === "oui"

  if (!contrat) return { erreur: d.erreurs.generique }

  try {
    await api(`/v1/contrats/${contrat}/reponse`, {
      methode: "POST",
      corps: { oui },
    })
  } catch (erreur) {
    return {
      erreur:
        erreur instanceof ErreurApi ? erreur.message : d.erreurs.generique,
    }
  }

  revalidatePath("/", "layout")
  return {}
}

/**
 * Ouvrir — ou retrouver — le fil avec un répétiteur.
 *
 * Seul un parent le peut : un répétiteur qui écrirait le premier démarcherait
 * les familles de l'annuaire. La base le refuse, cette action ne fait que
 * porter la demande.
 *
 * Elle rend le fil existant plutôt que d'en créer un second : reprendre une
 * question trois semaines plus tard, c'est la même conversation.
 */
export async function ouvrirConversation(
  _precedent: EtatProposition,
  donnees: FormData,
): Promise<EtatProposition> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const repetiteurId = String(donnees.get("repetiteur") ?? "")

  if (!repetiteurId) return { erreur: d.erreurs.generique }

  let id: string
  try {
    const r = await api<{ id: string }>("/v1/messagerie", {
      methode: "POST",
      corps: { repetiteurId },
    })
    id = r.id
  } catch (erreur) {
    return {
      erreur:
        erreur instanceof ErreurApi ? erreur.message : d.erreurs.generique,
    }
  }

  redirect(chemin(langue, `/messages/${id}`))
}
