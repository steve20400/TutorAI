"use client"

import { useActionState, useEffect, useRef } from "react"

import { envoyerMessage, type EtatMessage } from "@/actions/messagerie"
import { type Dictionnaire, type Langue } from "@/langues"

const VIDE: EtatMessage = {}

export type Message = {
  id: string
  auteur_id: string
  texte: string
  cree_le: string
  lu_le: string | null
}

/**
 * Un fil, et le champ pour y répondre.
 *
 * Les messages arrivent par le temps réel : la page se relit, et ce composant
 * reçoit la nouvelle liste. On ne garde donc aucun état local des messages —
 * un état local et une liste servie finissent toujours par se contredire, et
 * c'est au moment où l'un des deux a raison qu'on s'en aperçoit.
 *
 * Le champ se vide après l'envoi, et la vue descend au dernier message. Sans
 * cela, on écrit dans le vide : la réponse est arrivée, mais sous le pli.
 */
export function FilMessages({
  messages,
  moi,
  conversationId,
  langue,
  d,
}: {
  messages: Message[]
  moi: string
  conversationId: string
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.messagerie
  const [etat, action, enCours] = useActionState(envoyerMessage, VIDE)
  const bas = useRef<HTMLDivElement | null>(null)
  const champ = useRef<HTMLTextAreaElement | null>(null)
  const dernier = messages.at(-1)?.id

  useEffect(() => {
    bas.current?.scrollIntoView({ block: "end" })
  }, [dernier])

  useEffect(() => {
    if (!enCours && champ.current) champ.current.value = ""
  }, [enCours])

  const heure = (iso: string) =>
    new Date(iso).toLocaleTimeString(langue === "fr" ? "fr-FR" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <>
      <div className="flex flex-1 flex-col gap-2 py-2">
        {messages.length === 0 ? (
          <p className="doux text-sm leading-relaxed">{t.vide}</p>
        ) : (
          messages.map((m) => {
            const demoi = m.auteur_id === moi
            return (
              <div
                key={m.id}
                className={`max-w-[82%] rounded-[12px] px-3.5 py-2.5 ${
                  demoi ? "self-end" : "self-start"
                }`}
                style={
                  demoi
                    ? { background: "var(--accent)", color: "var(--accent-texte)" }
                    : {
                        background:
                          "color-mix(in srgb, var(--texte) 6%, var(--fond))",
                      }
                }
              >
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed">
                  {m.texte}
                </p>
                <p className="mt-1 text-right text-[10px] opacity-60">
                  {heure(m.cree_le)}
                </p>
              </div>
            )
          })
        )}
        <div ref={bas} />
      </div>

      <form action={action} className="sticky bottom-0 flex flex-col gap-2 pb-4">
        <input type="hidden" name="langue" value={langue} />
        <input type="hidden" name="conversation" value={conversationId} />

        {etat.erreur ? (
          <p className="text-[12px]" style={{ color: "var(--erreur-texte)" }}>
            {etat.erreur}
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <textarea
            ref={champ}
            name="texte"
            required
            rows={2}
            maxLength={4000}
            placeholder={t.champ}
            className="champ max-h-40 min-h-[46px] flex-1 resize-y px-3 py-2.5 text-[14px]"
          />
          <button
            type="submit"
            disabled={enCours}
            className="bouton shrink-0 px-4 py-3 text-[14px]"
          >
            {enCours ? d.commun.enCours : t.envoyer}
          </button>
        </div>
      </form>
    </>
  )
}
