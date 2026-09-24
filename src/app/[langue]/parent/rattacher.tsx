"use client"

import { useActionState } from "react"

import { useLangue } from "@/langues/contexte"
import { demanderRattachement, type EtatRattachement } from "@/actions/liens"
import { Message } from "../(auth)/champs"

const ETAT_INITIAL: EtatRattachement = {}

/**
 * Rattacher un enfant déjà inscrit.
 *
 * L'adulte saisit le nom de connexion de l'enfant, et n'obtient rien — pas
 * même la confirmation que le compte existe. Un nom inventé et un nom réel
 * donnent exactement la même réponse : sans ce silence, ce champ deviendrait
 * un annuaire des enfants inscrits.
 *
 * Et surtout : on ne lui demande PAS le mot de passe de l'enfant. Ce serait la
 * preuve la plus forte et la pire — elle apprendrait à chaque enfant de la
 * plateforme que donner son mot de passe à un adulte qui l'aide est la
 * procédure normale. Le jour où un répétiteur le lui demande, l'enfant n'aurait
 * plus aucun moyen de distinguer l'abus.
 *
 * C'est l'enfant qui reconnaît, sur son propre écran, un nom et un visage.
 */
export function Rattacher() {
  const { langue, d } = useLangue()
  const [etat, action, enCours] = useActionState(
    demanderRattachement,
    ETAT_INITIAL,
  )
  const t = d.parent.rattacher

  return (
    <section className="carte p-5">
      <div className="font-medium">{t.titre}</div>
      <p className="doux mt-1 text-sm leading-relaxed">{t.detail}</p>

      <form action={action} className="mt-3 flex flex-col gap-2.5">
        <input type="hidden" name="langue" value={langue} />

        <div className="flex flex-wrap gap-2">
          <input
            name="nom"
            required
            minLength={2}
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            placeholder={t.exemple}
            className="champ min-w-[200px] flex-1 px-3 py-2 text-[14px]"
          />
          <button type="submit" disabled={enCours} className="bt1 px-4 py-2">
            {enCours ? d.commun.enCours : t.envoyer}
          </button>
        </div>

        <Message erreur={etat.erreur} info={etat.info} />
      </form>
    </section>
  )
}
