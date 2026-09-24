"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import { chemin } from "@/langues"
import { useLangue } from "@/langues/contexte"
import { Bouton, Champ, Message } from "../champs"
import {
  demanderPourUnEnfant,
  envoyerLeLien,
  type EtatRecuperation,
} from "@/actions/recuperation"

const ETAT_INITIAL: EtatRecuperation = {}

export function Demande() {
  const { langue, d } = useLangue()
  const t = d.recuperation
  const [etat, action, enCours] = useActionState(envoyerLeLien, ETAT_INITIAL)

  // L'adresse est gardée pour le renvoi : après l'envoi, le champ disparaît
  // et il faudrait la retaper — au moment précis où l'on est déjà agacé
  // d'attendre.
  const [adresse, setAdresse] = useState("")
  const envoye = Boolean(etat.info)
  const [etatEnfant, actionEnfant, enfantEnCours] = useActionState(
    demanderPourUnEnfant,
    ETAT_INITIAL,
  )

  return (
    <>
      {envoye ? (
        /* Ce qui vient de se passer, et quoi faire si rien n'arrive.

           Un simple « c'est envoyé » laisse seul celui dont le courriel
           tombe en indésirable ou met dix minutes : il recharge, réessaie,
           puis renonce. Le délai est écrit, et le renvoi est à portée. */
        <div className="flex flex-col gap-3">
          <p
            className="rounded-[10px] px-3.5 py-3 text-[13px] leading-relaxed"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            {etat.info}
          </p>

          <form action={action}>
            <input type="hidden" name="langue" value={langue} />
            <input type="hidden" name="email" value={adresse} />
            <Bouton enCours={enCours}>{t.renvoyer}</Bouton>
          </form>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="langue" value={langue} />

          <Champ
            label={t.email}
            name="email"
            type="email"
            autoComplete="email"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            required
          />

          <Message erreur={etat.erreur} />

          <Bouton enCours={enCours}>{t.envoyer}</Bouton>
        </form>
      )}

      {/* L'enfant, qui n'a pas d'adresse.

          Il donne son nom de connexion, et ce sont ses adultes qui sont
          prévenus — par courriel ET dans leur espace. La carte ne dépend
          d'aucun service d'envoi : il n'est donc jamais bloqué par le
          courrier. */}
      <div
        className="flex flex-col gap-2.5 rounded-[10px] px-3.5 py-3"
        style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
      >
        <div className="text-[13px] font-medium">{t.enfantLien}</div>

        <form action={actionEnfant} className="flex flex-col gap-2">
          <input type="hidden" name="langue" value={langue} />
          <Champ label={t.enfantNom} name="nom" autoComplete="off" required />
          <Message erreur={etatEnfant.erreur} info={etatEnfant.info} />
          <Bouton enCours={enfantEnCours}>{t.enfantDemander}</Bouton>
        </form>

        <p className="doux text-[11.5px] leading-relaxed">{t.enfantDetail}</p>
      </div>

      <Link
        href={chemin(langue, "/connexion")}
        className="doux text-sm underline underline-offset-4"
      >
        {t.retourConnexion}
      </Link>
    </>
  )
}
