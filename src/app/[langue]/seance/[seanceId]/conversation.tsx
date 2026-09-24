"use client"

import { useEffect, useRef, useState } from "react"
import { JaugeEleve } from "@/composants/jauge-eleve"
import { TexteMathematique } from "@/composants/texte-mathematique"

import { useLangue } from "@/langues/contexte"
import type { AuteurMessage } from "@/types/db"

type Bulle = { id: string; auteur: AuteurMessage; contenu: string }

/**
 * Le fil de la séance.
 *
 * Le message de l'élève apparaît immédiatement, avant la réponse du serveur :
 * sur un réseau mobile lent, voir son propre message partir change tout. Si
 * l'envoi échoue, la bulle est retirée et le texte rendu à l'élève pour qu'il
 * n'ait rien à retaper.
 */
export function Conversation({
  seanceId,
  messagesInitiaux,
}: {
  seanceId: string
  messagesInitiaux: Bulle[]
}) {
  const { langue, d } = useLangue()
  const [bulles, setBulles] = useState<Bulle[]>(messagesInitiaux)
  const [saisie, setSaisie] = useState("")
  const [enAttente, setEnAttente] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const bas = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth" })
  }, [bulles, enAttente])

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    const contenu = saisie.trim()
    if (!contenu || enAttente) return

    const provisoire = `local-${bulles.length}`
    setBulles((b) => [...b, { id: provisoire, auteur: "eleve", contenu }])
    setSaisie("")
    setErreur(null)
    setEnAttente(true)

    try {
      const r = await fetch(`/api/seance/${seanceId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu }),
      })

      const data = (await r.json()) as {
        reponse?: string
        /** Famille de la panne : le message, lui, reste au journal du serveur. */
        code?: keyof typeof d.tuteur.tuteurIndisponible
        erreur?: string
      }

      if (!r.ok || !data.reponse) {
        // On rend son texte à l'élève plutôt que de le lui faire retaper.
        setBulles((b) => b.filter((x) => x.id !== provisoire))
        setSaisie(contenu)
        // Une phrase que l'élève peut lire, dans sa langue. Le message du
        // fournisseur est en anglais et technique — « This model is currently
        // experiencing high demand » — et un enfant de cinquième ne doit
        // jamais le voir.
        setErreur(
          (data.code && d.tuteur.tuteurIndisponible[data.code]) ??
            data.erreur ??
            d.seance.envoiEchoue,
        )
        return
      }

      setBulles((b) => [
        ...b,
        { id: `t-${b.length}`, auteur: "tuteur", contenu: data.reponse! },
      ])
    } catch {
      setBulles((b) => b.filter((x) => x.id !== provisoire))
      setSaisie(contenu)
      setErreur(d.seance.pasDeConnexion)
    } finally {
      setEnAttente(false)
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
        {bulles.map((b) => (
          <div
            key={b.id}
            className={
              b.auteur === "eleve"
                ? "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-amber-700 px-4 py-2.5 text-white"
                : "max-w-[90%] self-start rounded-2xl rounded-bl-sm bg-black/[0.05] px-4 py-2.5 dark:bg-white/[0.08]"
            }
          >
            <TexteMathematique texte={b.contenu} />
          </div>
        ))}

        {enAttente && (
          <div
            aria-live="polite"
            className="max-w-[90%] self-start rounded-2xl rounded-bl-sm bg-black/[0.05] px-4 py-2.5 text-sm opacity-60 dark:bg-white/[0.08]"
          >
            Ton tuteur réfléchit…
          </div>
        )}

        <div ref={bas} />
      </div>

      {erreur && (
        <p
          role="status"
          className="mb-2 rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
        >
          {erreur}
        </p>
      )}

      <form onSubmit={envoyer} className="flex items-end gap-2 pb-4">
        {/* À côté du champ, comme sur l'écran d'essai : au moment où la
            question « est-ce que je peux continuer ? » se pose, et non dans
            un écran de réglages qu'un enfant n'ouvrira jamais. */}
        <JaugeEleve langue={langue} />

        <textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            // Entrée envoie ; Maj+Entrée passe à la ligne (utile pour un calcul).
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void envoyer(e as unknown as React.FormEvent)
            }
          }}
          rows={1}
          placeholder={d.seance.ecrisTaReponse}
          className="max-h-40 flex-1 resize-none rounded-2xl border border-black/15 bg-transparent px-4 py-2.5 text-base outline-none transition focus:border-amber-600/60 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={enAttente || saisie.trim() === ""}
          aria-label={d.seance.envoyer}
          className="rounded-full bg-amber-700 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-40"
        >
          →
        </button>
      </form>
    </>
  )
}
