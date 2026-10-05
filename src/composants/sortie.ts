"use client"

import { useState } from "react"

import { chemin, type Langue } from "@/langues"
import { oublierLaSession } from "@/lib/sortie"

/**
 * Le geste de partir, partagé par les quatre boutons de déconnexion.
 *
 * L'ordre des trois lignes n'est pas indifférent, et c'est tout l'intérêt de
 * les avoir écrites une seule fois.
 *
 * 1. PRÉVENIR SUPABASE D'ABORD. La requête emporte le témoin ; l'envoyer
 *    après l'avoir effacé la ferait arriver anonyme, et le jeton resterait
 *    valable. `sendBeacon` est fait pour ça : le navigateur s'en charge et la
 *    livre même si la page disparaît dans la foulée.
 *
 * 2. OUBLIER LA SESSION ICI. Sans réseau, sans attente. À partir de cette
 *    ligne, l'utilisateur est déconnecté — le middleware ne verra plus rien.
 *
 * 3. PARTIR POUR DE BON. `location.replace` et non une navigation interne :
 *    un départ doit tout emporter. Steve ouvre deux comptes dans le même
 *    navigateur ; une navigation douce garderait en mémoire les écrans du
 *    précédent, et il n'y a pas de pire bogue que celui qui montre l'enfant
 *    d'un autre. `replace` plutôt que `assign` pour que le retour arrière ne
 *    repose pas sur l'espace qu'on vient de quitter.
 *
 * Et si l'effacement échoue, on ne part pas : on laisse le formulaire
 * s'envoyer au serveur comme avant. C'est lent, mais c'est sûr — partir quand
 * même renverrait sur la connexion, que le middleware retournerait aussitôt
 * vers l'accueil. Le bouton paraîtrait n'avoir rien fait.
 */
export function useSortie(langue: Langue) {
  const [enCours, setEnCours] = useState(false)

  function quitter(e: React.FormEvent<HTMLFormElement>) {
    if (enCours) {
      e.preventDefault()
      return
    }

    prevenirLeServeur()

    // Le chemin rapide a échoué : on laisse le formulaire partir au serveur.
    if (!oublierLaSession()) return

    e.preventDefault()
    setEnCours(true)
    window.location.replace(chemin(langue, "/connexion"))
  }

  return { enCours, quitter }
}

/** La révocation, envoyée sans que personne l'attende. */
function prevenirLeServeur(): void {
  try {
    if (navigator.sendBeacon?.("/auth/sortie")) return
  } catch {
    // Quelques navigateurs refusent un beacon sans corps. Le repli suit.
  }

  // `keepalive` demande au navigateur de finir l'envoi après la navigation.
  // L'erreur est avalée : celui qui part ne peut plus rien lire.
  void fetch("/auth/sortie", { method: "POST", keepalive: true }).catch(() => {})
}
