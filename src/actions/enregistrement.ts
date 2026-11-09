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

/**
 * L'administration ouvre ou ferme l'enregistrement sur un compte précis.
 *
 * C'est l'interrupteur que le paiement actionnera. Tant que l'abonnement
 * n'existe pas, il s'actionne à la main — et le jour venu, c'est la même
 * fonction que le paiement appellera, pas une seconde écrite en urgence.
 *
 * La base revérifie que l'appelant est bien de l'administration : un écran
 * n'est pas une sécurité, et celui-ci commande une fonctionnalité qui
 * protège des enfants.
 */
export async function permettreEnregistrement(
  donnees: FormData,
): Promise<{ erreur?: string } | void> {
  const compte = String(donnees.get("compte") ?? "")
  const valeur = String(donnees.get("valeur") ?? "") === "true"
  if (!compte) return { erreur: "compte_manquant" }

  const supabase = await supabaseServeur()
  const { error } = await supabase.rpc("admin_permet_l_enregistrement", {
    compte,
    valeur,
  })

  if (error) {
    console.error("[enregistrement] bascule administration refusée :", error)
    return { erreur: "refuse" }
  }

  revalidatePath("/", "layout")
}
