"use server"

import { revalidatePath } from "next/cache"

import { dictionnaire, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"

export type EtatEnfant = {
  erreur?: string
  /** Rempli après succès : c'est ce que le parent doit retenir. */
  cree?: { prenom: string; identifiant: string }
}

/**
 * Crée le compte d'un enfant depuis l'espace parent.
 *
 * Tout le travail est dans `creer_compte_eleve`, côté base : c'est elle qui
 * vérifie que l'appelant est bien un parent, fabrique un identifiant unique et
 * pose le lien familial dans la même transaction. Le faire ici laisserait la
 * porte ouverte à un appel direct de l'API, et un enfant à moitié créé — sans
 * lien vers son parent — serait pire que pas d'enfant du tout.
 */
export async function creerEnfant(
  _precedent: EtatEnfant,
  donnees: FormData,
): Promise<EtatEnfant> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const prenom = String(donnees.get("prenom") ?? "").trim()
  const nom = String(donnees.get("nom") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")

  try {
    const cree = await api<{ id: string; identifiant: string }>("/v1/enfants", {
      methode: "POST",
      corps: { prenom, nom: nom || undefined, motDePasse },
    })

    revalidatePath("/", "layout")
    return { cree: { prenom, identifiant: cree.identifiant } }
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      // Les messages venus de la base sont déjà rédigés pour être lus : « Le
      // mot de passe doit faire au moins 6 caractères ». On ne les remplace
      // pas par un message générique qui n'aiderait personne.
      //
      // En revanche, pour une panne du service, le message technique ne dit
      // rien d'utile — et surtout il ne dit pas la seule chose qui compte
      // ici : que le compte n'a PAS été créé, et qu'il faut recommencer.
      if (erreur.statut >= 500) {
        return { erreur: d.parent.creationImpossible }
      }
      return { erreur: erreur.message }
    }
    return { erreur: d.parent.creationImpossible }
  }
}
