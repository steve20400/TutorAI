"use server"

import { revalidatePath } from "next/cache"

import { langueDeFormulaire } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"

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
  const prenom = String(donnees.get("prenom") ?? "").trim()
  const nom = String(donnees.get("nom") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")

  const supabase = await supabaseServeur()

  const { data, error } = await supabase.rpc("creer_compte_eleve", {
    prenom_eleve: prenom,
    nom_eleve: nom || null,
    mot_de_passe: motDePasse,
  })

  if (error) {
    // Les messages de la fonction sont déjà rédigés pour être lus : « Le mot
    // de passe doit faire au moins 6 caractères ». On ne les remplace pas par
    // un message générique qui n'aiderait personne.
    return { erreur: error.message }
  }

  const ligne = Array.isArray(data) ? data[0] : data
  revalidatePath("/", "layout")

  return {
    cree: {
      prenom,
      identifiant: (ligne as { identifiant?: string })?.identifiant ?? "",
    },
  }
}
