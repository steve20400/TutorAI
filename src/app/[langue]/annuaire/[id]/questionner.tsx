"use client"

import { useActionState } from "react"

import { ouvrirConversation, type EtatProposition } from "@/actions/contrats"
import { type Dictionnaire, type Langue } from "@/langues"

const VIDE: EtatProposition = {}

/**
 * Ouvrir le fil avec ce répétiteur.
 *
 * Le bouton n'écrit rien : il ouvre la conversation — ou retrouve celle qui
 * existe — et emmène sur le fil. Poser la question ici, dans un petit champ
 * coincé sous un tarif, donnerait l'impression d'un formulaire de contact à
 * sens unique, alors que c'est une conversation qui commence.
 *
 * Il ne s'affiche que pour un parent ayant un enfant rattaché : la base
 * refuserait de toute façon, et un bouton qui échoue toujours vaut moins
 * qu'un bouton absent.
 */
export function Questionner({
  repetiteurId,
  langue,
  d,
}: {
  repetiteurId: string
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.annuaire.dossier
  const [etat, action, enCours] = useActionState(ouvrirConversation, VIDE)

  return (
    <form action={action} className="mt-2.5">
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="repetiteur" value={repetiteurId} />

      {etat.erreur ? (
        <p className="mb-2 text-[12px]" style={{ color: "var(--erreur-texte)" }}>
          {etat.erreur}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enCours}
        className="bt3 block w-full px-4 py-3 text-[14.5px]"
      >
        {enCours ? d.commun.enCours : t.question}
      </button>
    </form>
  )
}
