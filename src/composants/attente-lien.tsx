"use client"

import { useLinkStatus } from "next/link"

/**
 * Le cercle qui tourne pendant qu'un lien charge.
 *
 * Un lien vers une page servie par le serveur ne montre rien tant que la page
 * n'est pas prête : l'écran reste identique, et on croit que le clic n'a pas
 * porté. On reclique. C'est exactement ce qui se passait entre « Créer un
 * compte » et « Se connecter ».
 *
 * `useLinkStatus` ne se lit que depuis un enfant du `<Link>` — d'où ce
 * composant minuscule plutôt qu'un état dans la page, qui est servie.
 *
 * Rien ne s'affiche pour une navigation instantanée : le cercle n'apparaît
 * que si l'attente dure, sinon il clignoterait à chaque clic.
 */
export function AttenteLien() {
  const { pending } = useLinkStatus()

  if (!pending) return null
  return (
    <span
      aria-hidden
      className="cercle-attente ml-1.5 inline-block align-middle"
    />
  )
}
