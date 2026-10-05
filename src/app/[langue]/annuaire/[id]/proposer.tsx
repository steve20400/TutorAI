"use client"

import { useActionState } from "react"

import { proposerSeance, type EtatProposition } from "@/actions/contrats"
import { type Dictionnaire, type Langue } from "@/langues"

const VIDE: EtatProposition = {}

export type EnfantChoisissable = {
  id: string
  prenom: string | null
  nom: string | null
}

/**
 * Proposer une séance à ce répétiteur.
 *
 * Le bouton du canevas disait « Proposer une séance », et c'est le mot juste :
 * rien n'est engagé tant que le répétiteur n'a pas répondu. L'écran le dit,
 * plutôt que de laisser croire au parent qu'il vient de recruter quelqu'un.
 *
 * Le choix de l'enfant n'est pas un détail d'ergonomie : un contrat lie un
 * répétiteur à UN élève. Sans ce choix, il faudrait en déduire un — et le
 * déduire voudrait dire le choisir à la place du parent.
 *
 * Les matières proposées sont celles que ce répétiteur enseigne, pas le
 * référentiel entier : lui proposer la philosophie quand il fait des maths
 * n'aide personne.
 */
export function Proposer({
  repetiteurId,
  matieres,
  enfants,
  langue,
  d,
}: {
  repetiteurId: string
  matieres: string[]
  enfants: EnfantChoisissable[]
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.annuaire.dossier
  const [etat, action, enCours] = useActionState(proposerSeance, VIDE)

  if (etat.info) {
    return (
      <p
        className="rounded-[9px] px-3.5 py-3 text-[13px] leading-relaxed"
        style={{
          background: "var(--accent-doux)",
          color: "var(--accent-doux-texte)",
        }}
      >
        {etat.info}
      </p>
    )
  }

  if (enfants.length === 0) {
    return (
      <p className="doux text-[12.5px] leading-relaxed">{t.sansEnfant}</p>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="repetiteur" value={repetiteurId} />

      <label className="block">
        <span className="doux block text-[11.5px]">{t.pourQui}</span>
        <select
          name="eleve"
          required
          className="champ mt-1 w-full px-3 py-2.5 text-[14px]"
        >
          {enfants.map((e) => (
            <option key={e.id} value={e.id}>
              {[e.prenom, e.nom].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="doux block text-[11.5px]">{t.quelleMatiere}</span>
        <select
          name="matiere"
          required
          className="champ mt-1 w-full px-3 py-2.5 text-[14px]"
        >
          {matieres.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {etat.erreur ? (
        <p className="text-[12.5px]" style={{ color: "var(--erreur-texte)" }}>
          {etat.erreur}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enCours}
        className="bouton w-full px-4 py-3.5 text-[14.5px]"
      >
        {enCours ? d.commun.enCours : t.envoyer}
      </button>

      <p className="doux text-[11.5px] leading-relaxed">{t.proposerDetail}</p>
    </form>
  )
}
