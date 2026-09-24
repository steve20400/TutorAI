"use client"

import { useFormStatus } from "react-dom"

/**
 * Un bouton qui dit qu'il travaille.
 *
 * Sans lui, l'administration cliquait « Gemini », rien ne bougeait, et elle
 * recliquait — envoyant deux ou trois requêtes pour un seul geste. Ce n'est
 * pas de l'impatience : Render endort le service au bout de quinze minutes et
 * le réveil prend une cinquantaine de secondes. Un bouton muet pendant
 * cinquante secondes est un bouton cassé, quoi qu'il fasse ensuite.
 *
 * Le libellé reste en place et un cercle tourne devant lui. Remplacer le texte
 * par « un instant » ferait perdre de vue ce qu'on a demandé, et changerait la
 * largeur du bouton — donc la position de ses voisins, sous le doigt qui vient
 * de cliquer.
 *
 * `useFormStatus` se lit depuis un enfant du formulaire : d'où ce petit
 * composant client, plutôt qu'un état dans la page, qui est servie.
 *
 * Quand un formulaire porte plusieurs boutons, tous se figent pendant l'envoi.
 * C'est voulu : on ne change pas d'avis en cours de route. Mais seul celui
 * qu'on a pressé montre le cercle, retrouvé dans les données envoyées.
 */
export function BoutonAction({
  nom,
  valeur,
  className,
  desactive,
  style,
  children,
}: {
  /** Nom du champ, quand plusieurs boutons partagent un formulaire. */
  nom?: string
  valeur?: string
  className: string
  desactive?: boolean
  /** Le refus d'un dossier se teinte de rouge : on laisse passer un style. */
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const { pending, data } = useFormStatus()

  // Lequel a été pressé : sans ça, les trois boutons tourneraient ensemble et
  // on ne saurait plus lequel on a choisi.
  const cestMoi = !nom || !valeur || data?.get(nom) === valeur

  const enAttente = pending && cestMoi

  return (
    <button
      type="submit"
      name={nom}
      value={valeur}
      disabled={pending || desactive}
      aria-busy={enAttente}
      className={`${className} inline-flex items-center justify-center gap-2`}
      style={pending && !cestMoi ? { ...style, opacity: 0.4 } : style}
    >
      {enAttente ? <span aria-hidden className="cercle-attente" /> : null}
      {children}
    </button>
  )
}
