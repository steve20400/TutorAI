"use client"

import { useState } from "react"

import { statuerSurPiece } from "@/actions/admin"
import { BoutonAction } from "@/composants/bouton-action"
import type { Dictionnaire, Langue } from "@/langues"

/**
 * Le verdict sur une pièce, sous la pièce.
 *
 * Trois états et pas deux, parce qu'ils ne disent pas la même chose à celui
 * qui a déposé. « Contrôlée » la rend visible aux familles — c'est elle, et
 * elle seule, qui remplit la ligne « Ce qui a été contrôlé » d'un dossier
 * public. « Illisible » dit « recommencez la photo », ce qui est le cas
 * courant et n'est pas un reproche. « Refusée » dit « ce document ne convient
 * pas », et demande un motif.
 *
 * Le motif n'apparaît qu'au moment où il sert. Posé en permanence sous chaque
 * pièce, il donnerait trois champs de saisie à un écran dont le geste normal
 * est un clic — et il ferait croire qu'on doit écrire quelque chose pour
 * valider.
 *
 * Le verdict rendu est marqué, mais rien n'est grisé : on revient sur une
 * décision, c'est même le propre d'une décision humaine. Marquer « contrôlée »
 * une pièce qu'on avait jugée illisible doit rester un clic.
 */
export function VerdictPiece({
  pieceId,
  statut,
  langue,
  d,
}: {
  pieceId: string
  statut: string
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.adminPages.dossier
  const [refus, poserRefus] = useState(false)

  if (refus) {
    return (
      <form
        action={statuerSurPiece}
        className="mt-2 flex flex-col gap-1.5"
        onSubmit={() => poserRefus(false)}
      >
        <input type="hidden" name="langue" value={langue} />
        <input type="hidden" name="pieceId" value={pieceId} />
        <input type="hidden" name="verdict" value="refusee" />
        <input
          name="motif"
          required
          autoFocus
          placeholder={t.motifPiece}
          className="champ w-full px-2.5 py-1.5 text-[12px]"
        />
        <div className="flex gap-1.5">
          <BoutonAction
            className="bt2 px-2.5 py-1 text-[11.5px]"
            style={{
              color: "var(--erreur-texte)",
              borderColor: "var(--erreur-texte)",
            }}
          >
            {t.verdictRefuser}
          </BoutonAction>
          <button
            type="button"
            onClick={() => poserRefus(false)}
            className="bt3 px-2.5 py-1 text-[11.5px]"
          >
            {t.verdictAnnuler}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form action={statuerSurPiece} className="mt-2 flex flex-wrap gap-1.5">
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="pieceId" value={pieceId} />

      <BoutonAction
        nom="verdict"
        valeur="lisible"
        className="bt3 px-2.5 py-1 text-[11.5px]"
        style={
          statut === "lisible"
            ? {
                borderColor: "var(--accent-doux-texte)",
                color: "var(--accent-doux-texte)",
              }
            : undefined
        }
      >
        {t.verdictLisible}
      </BoutonAction>

      <BoutonAction
        nom="verdict"
        valeur="illisible"
        className="bt3 px-2.5 py-1 text-[11.5px]"
        style={
          statut === "illisible"
            ? { borderColor: "var(--voyant)", color: "var(--voyant)" }
            : undefined
        }
      >
        {t.verdictIllisible}
      </BoutonAction>

      <button
        type="button"
        onClick={() => poserRefus(true)}
        className="bt3 px-2.5 py-1 text-[11.5px]"
        style={
          statut === "refusee"
            ? {
                borderColor: "var(--erreur-texte)",
                color: "var(--erreur-texte)",
              }
            : undefined
        }
      >
        {t.verdictRefuser}
      </button>
    </form>
  )
}
