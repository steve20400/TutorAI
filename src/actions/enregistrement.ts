"use server"

import { revalidatePath } from "next/cache"

import { supabaseServeur } from "@/lib/supabase/server"

/**
 * Le parent choisit, pour sa famille, que les séances soient enregistrées.
 *
 * Par une fonction en base et non par un `update` : ouvrir `profils` à
 * l'écriture pour un booléen laisserait modifier le prénom, l'identifiant ou
 * la photographie — et il a fallu une migration entière pour fermer l'adresse
 * électronique. La règle des trois niveaux vit du même côté que les
 * politiques qui l'appliquent, donc elle ne peut pas diverger.
 *
 * La fonction refuse si le module est éteint pour la plateforme, ou si
 * l'administration a fermé ce compte. Dans les deux cas l'écran ne propose
 * déjà rien — mais un écran n'est pas une sécurité.
 */
export async function choisirEnregistrement(
  donnees: FormData,
): Promise<{ erreur?: string } | void> {
  const valeur = String(donnees.get("valeur") ?? "") === "true"
  const supabase = await supabaseServeur()

  const { error } = await supabase.rpc("je_choisis_l_enregistrement", {
    valeur,
  })

  if (error) {
    // Bruyant côté serveur, bref côté écran : le parent n'a que faire du nom
    // d'une fonction, mais celui qui lit les journaux en a besoin.
    console.error("[enregistrement] choix refusé :", error)
    return { erreur: "refuse" }
  }

  revalidatePath("/", "layout")
}
