"use client"

import { useActionState } from "react"

import { repondreProposition, type EtatProposition } from "@/actions/contrats"
import { remplir, type Dictionnaire, type Langue } from "@/langues"

const VIDE: EtatProposition = {}

export type Proposition = {
  id: string
  matiere: string
  tarif: number | null
  frequence: string | null
  /** Le prénom seul : avant d'accepter, il n'a pas à connaître le nom. */
  prenom: string | null
}

/**
 * Les propositions qu'un répétiteur a reçues, et sa réponse.
 *
 * Elle manquait entièrement : le parent créait le contrat, le répétiteur le
 * voyait apparaître, et se retrouvait avec des élèves sans avoir rien dit.
 * C'était la seule place du produit où celui qui reçoit n'avait pas son mot à
 * dire — l'enfant reconnaît avant qu'un lien existe, l'adulte peut se
 * détacher, l'enfant peut couper.
 *
 * Deux boutons et pas de second temps : refuser une proposition n'est pas
 * destructeur. La famille en sera informée et cherchera ailleurs, ce qui est
 * exactement ce qu'on veut qu'il se passe.
 */
export function PropositionsRepetiteur({
  propositions,
  langue,
  d,
}: {
  propositions: Proposition[]
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.repetiteurProfil.propositions

  return (
    <section className="carte p-5">
      <div className="text-[14px] font-medium">{t.titre}</div>
      <p className="doux mt-1 text-[12px] leading-relaxed">{t.detail}</p>

      {propositions.length === 0 ? (
        <p className="doux mt-3 text-[12.5px]">{t.aucune}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {propositions.map((p) => (
            <Ligne key={p.id} p={p} langue={langue} d={d} />
          ))}
        </ul>
      )}

      {propositions.length > 0 ? (
        <p className="doux mt-4 text-[11.5px] leading-relaxed">{t.refusDit}</p>
      ) : null}
    </section>
  )
}

function Ligne({
  p,
  langue,
  d,
}: {
  p: Proposition
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.repetiteurProfil.propositions
  const [etat, action, enCours] = useActionState(repondreProposition, VIDE)
  const nom = p.prenom ?? "—"

  return (
    <li
      className="border-t pt-3"
      style={{ borderColor: "var(--bordure)" }}
    >
      <div className="text-[13.5px] font-medium">{nom}</div>
      <p className="doux mt-0.5 text-[12px]">
        {remplir(t.pour, { matiere: p.matiere })}
        {p.frequence ? ` · ${p.frequence}` : ""}
      </p>

      {etat.erreur ? (
        <p className="mt-1 text-[12px]" style={{ color: "var(--erreur-texte)" }}>
          {etat.erreur}
        </p>
      ) : null}

      <form action={action} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="langue" value={langue} />
        <input type="hidden" name="contrat" value={p.id} />
        <button
          type="submit"
          name="reponse"
          value="oui"
          disabled={enCours}
          className="bt1 px-3 py-1.5 text-xs"
        >
          {t.accepter}
        </button>
        <button
          type="submit"
          name="reponse"
          value="non"
          disabled={enCours}
          className="bt3 px-3 py-1.5 text-xs"
        >
          {t.refuser}
        </button>
      </form>
    </li>
  )
}
