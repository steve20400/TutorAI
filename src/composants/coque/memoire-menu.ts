/**
 * Le menu du compte survit à un changement de langue.
 *
 * Changer de thème ne bouge rien : c'est une classe sur la page, le menu
 * reste ouvert là où il était. Changer de langue traversait `[langue]`, donc
 * remontait tout l'arbre — et le menu disparaissait AVANT que la langue ne
 * change. Steve a mis les deux côte à côte : « quand je clique pour changer
 * le thème, le menu reste où il était ; quand je clique pour changer la
 * langue, il disparaît. »
 *
 * On ne peut pas empêcher le remontage : la langue est dans l'adresse, et
 * c'est ce qui permet de partager un lien dans la bonne langue. On transmet
 * donc un mot au composant qui va renaître — « tu étais ouvert ».
 *
 * Il se consomme à la lecture, et c'est essentiel : sans cela, le menu
 * rouvrirait à chaque navigation ultérieure, y compris quand on l'a fermé
 * exprès en cliquant une de ses entrées.
 *
 * `sessionStorage` et non une variable de module : un changement de langue
 * peut repasser par le serveur, et une variable de module ne traverserait pas
 * un rechargement. Il meurt avec l'onglet, ce qui est exactement sa portée.
 */
const CLE = "tutela-menu-ouvert"

export function memoriserMenuOuvert(): void {
  try {
    sessionStorage.setItem(CLE, "1")
  } catch {
    // Navigation privée, stockage refusé : le menu se refermera, sans plus.
  }
}

export function consommerMenuOuvert(): boolean {
  try {
    if (sessionStorage.getItem(CLE) === null) return false
    sessionStorage.removeItem(CLE)
    return true
  } catch {
    return false
  }
}
