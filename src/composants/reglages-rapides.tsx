import { BasculeLangue } from "@/composants/langue"
import { BasculeMode } from "@/composants/theme"

/**
 * La langue et l'affichage, à portée de main dans chaque espace.
 *
 * Ils n'existaient que sur l'écran de connexion et dans l'administration. Un
 * parent connecté devait donc se déconnecter pour passer en clair, et un
 * répétiteur anglophone pour changer de langue — ce qu'évidemment personne ne
 * fait : on renonce, et on garde un écran qu'on lit mal.
 *
 * Posés à côté du bouton de sortie, où l'on cherche déjà ce genre de réglage.
 */
export function ReglagesRapides() {
  return (
    <span className="flex items-center gap-1">
      <BasculeLangue />
      <BasculeMode />
    </span>
  )
}
