"use client"

import { useActionState } from "react"

import { dictionnaire, remplir, type Langue } from "@/langues"
import {
  poserPourSonEnfant,
  renvoyerLaDemande,
  type EtatRecuperation,
} from "@/actions/recuperation"
import { Bouton, Champ, Message } from "../../(auth)/champs"

export type DemandeMotDePasse = {
  id: string
  eleve_id: string
  prenom: string | null
  nom: string | null
  expire_le: string
  /** Vraie quand les dix minutes ont passé, ou qu'elle a déjà servi. */
  fermee?: boolean
}

const ETAT_INITIAL: EtatRecuperation = {}

/**
 * « Junior a oublié son mot de passe. »
 *
 * En tête de l'espace du parent, avant tout le reste : un enfant dehors n'a
 * rien d'autre à faire qu'attendre, et chaque minute compte — la demande ne
 * vaut que dix minutes.
 *
 * C'est le second canal, à côté du courriel. Il ne dépend d'aucun service
 * d'envoi : l'enfant n'est donc jamais bloqué par le courrier, ni par une
 * boîte qu'on n'ouvre pas.
 */
export function Liste({
  langue,
  demandes,
}: {
  langue: Langue
  demandes: DemandeMotDePasse[]
}) {
  return (
    <div className="flex flex-col gap-3">
      {demandes.map((d) => (
        <Carte key={d.id} langue={langue} demande={d} />
      ))}
    </div>
  )
}

function Carte({
  langue,
  demande,
}: {
  langue: Langue
  demande: DemandeMotDePasse
}) {
  const d = dictionnaire(langue)
  const t = d.recuperation
  const [etat, action, enCours] = useActionState(poserPourSonEnfant, ETAT_INITIAL)

  const heure = new Date(demande.expire_le).toLocaleTimeString(langue, {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <section className="carte p-5" style={{ borderColor: "var(--accent)" }}>
      <div className="text-[14px] font-medium">
        {remplir(t.carteTitre, { prenom: demande.prenom ?? "" })}
      </div>
      <p className="doux mt-1 text-[12.5px] leading-relaxed">
        {remplir(t.carteDetail, { heure })}
      </p>

      {/* La zone reste VISIBLE et verrouillée, plutôt que de disparaître.

          Un champ qui s'efface fait croire à une erreur d'affichage, et l'on
          recharge la page en boucle. Verrouillé, avec sa raison écrite à côté,
          il dit ce qui s'est passé : c'est fini, et pourquoi. */}
      <form action={action} className="mt-3 flex flex-col gap-2.5">
        <input type="hidden" name="langue" value={langue} />
        <input type="hidden" name="demande" value={demande.id} />

        <Champ
          label={t.carteChamp}
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          required
          disabled={demande.fermee}
        />

        <Message erreur={etat.erreur} info={etat.info} />

        {demande.fermee ? (
          <p className="doux text-[12px] leading-relaxed">{t.carteFermee}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Bouton enCours={enCours}>{t.carteValider}</Bouton>
          </div>
        )}
      </form>

      {/* Renvoyer, quand les dix minutes ont passé sans qu'on ait pu agir.
          La demande précédente se ferme à la seconde. */}
      <form action={renvoyerLaDemande} className="mt-2">
        <input type="hidden" name="langue" value={langue} />
        <input type="hidden" name="eleve" value={demande.eleve_id} />
        <button type="submit" className="doux text-[12px] underline underline-offset-4">
          {t.renvoyer}
        </button>
      </form>
    </section>
  )
}
