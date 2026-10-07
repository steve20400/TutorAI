import type { Cours } from "@/composants/mes-cours"
import { supabaseServeur } from "@/lib/supabase/server"

/**
 * Les cours de l'appelant, lus par la fonction `mes_cours` (migration 073).
 *
 * Par la base et non par le service : un répétiteur ne peut pas lire le profil
 * de son élève — la politique de la migration 029 ne l'ouvre qu'à soi-même, à
 * ses enfants et à l'administration — et il faut pourtant le prénom pour dire
 * « avec Junior ». La fonction est la porte, et elle ne rend que ce prénom-là.
 *
 * Trois écrans l'appellent : l'espace du répétiteur, l'accueil de l'enfant et
 * l'espace de l'adulte. Le lire ici une fois évite trois copies d'une même
 * requête, dont deux finiraient par ne plus ressembler à la troisième.
 */
export async function lireMesCours(): Promise<Cours[]> {
  try {
    const supabase = await supabaseServeur()
    const { data, error } = await supabase.rpc("mes_cours")
    if (error) throw error
    return (data ?? []) as Cours[]
  } catch (erreur) {
    // L'écran se passe de cette section plutôt que de tomber : le reste de la
    // page garde son sens sans elle.
    console.error("[cours] lecture impossible :", erreur)
    return []
  }
}
