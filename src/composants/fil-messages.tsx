"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"

import { envoyerMessage, type EtatMessage } from "@/actions/messagerie"
import { supabaseNavigateur } from "@/lib/supabase/client"
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
 * ── POURQUOI CE COMPOSANT ÉCOUTE LUI-MÊME ──
 *
 * Il ne le faisait pas. Un message reçu déclenchait `router.refresh()`, et
 * toute la page se rejouait : la liste des fils était redemandée au service,
 * les messages relus, l'écran entier remplacé. Steve l'a vu pour ce que
 * c'était — « la page s'actualisait à chaque message ». Sur une conversation,
 * c'est intenable : la vue saute, et ce qu'on était en train d'écrire vit
 * dans un champ qui vient d'être remonté.
 *
 * Pire, et invisible : chaque rafraîchissement renvoyait le « marquer comme
 * lu » de la page. Une écriture de plus par message reçu, pour rien.
 *
 * Un commentaire disait ici qu'on ne garde aucun état local, « un état local
 * et une liste servie finissent toujours par se contredire ». C'était juste
 * pour un écran quelconque, et faux pour celui-ci : une conversation ne fait
 * qu'AJOUTER à la fin. C'est la seule forme de donnée où l'état local ne peut
 * pas contredire le serveur — il ne peut que le précéder.
 *
 * La liste servie reste la vérité au chargement ; ce qui arrive ensuite s'y
 * ajoute, et tout ce qui est déjà dans la liste servie est écarté par son
 * identifiant. Rouvrir le fil repart donc du serveur, sans rien de collé.
 *
 * ── L'ÉCHO DE SON PROPRE MESSAGE ──
 *
 * Il part, et il revient par le même chemin que celui de l'autre. Sur une
 * connexion lente, cela veut dire écrire, envoyer, et regarder un écran vide
 * pendant deux secondes en se demandant si c'est parti. Le message s'affiche
 * donc tout de suite, en attente, et le vrai le remplace quand il arrive.
 *
 * S'il n'arrive pas, on le dit et on rend le texte : un message perdu qui
 * reste affiché est un mensonge, et un champ vidé après un échec est un
 * message qu'on a écrit deux fois.
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

  /** Ce qui est arrivé par le temps réel depuis que l'écran est ouvert. */
  const [recus, poserRecus] = useState<Message[]>([])
  /** Ce qu'on vient d'envoyer et qui n'est pas encore revenu. */
  const [enVol, poserEnVol] = useState<Message[]>([])

  // ── L'écoute, par ce composant et non par la page ───────────────────────
  useEffect(() => {
    const supabase = supabaseNavigateur()
    let vivant = true
    let canal: ReturnType<typeof supabase.channel> | null = null
    let enPanne = false

    const { data: veille } = supabase.auth.onAuthStateChange((e, session) => {
      if (!session?.access_token) {
        // Session morte : le canal se rouvrirait en anonyme et serait refusé
        // sans fin. Voir `temps-reel.tsx`, même raison.
        vivant = false
        if (canal) {
          void supabase.removeChannel(canal)
          canal = null
        }
        return
      }
      void supabase.realtime.setAuth(session.access_token)
    })

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!vivant || !session?.access_token) return
      void supabase.realtime.setAuth(session.access_token)

      canal = supabase.channel(`fil:${conversationId}`)
      canal.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_familles",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (charge) => {
          const arrive = charge.new as Message
          if (!arrive?.id) return

          poserRecus((avant) =>
            avant.some((m) => m.id === arrive.id) ? avant : [...avant, arrive],
          )

          // Le mien revient : l'exemplaire en attente n'a plus lieu d'être.
          // Comparé sur l'auteur et le texte — deux envois identiques à la
          // suite retirent le plus ancien, ce qui est exactement juste.
          if (arrive.auteur_id === moi) {
            poserEnVol((avant) => {
              const i = avant.findIndex((m) => m.texte === arrive.texte)
              if (i === -1) return avant
              return [...avant.slice(0, i), ...avant.slice(i + 1)]
            })
          }
        },
      )

      canal.subscribe((statut, erreur) => {
        if (statut === "SUBSCRIBED") {
          if (enPanne) {
            console.info("[fil] canal rétabli :", conversationId)
            enPanne = false
          }
          return
        }
        if (enPanne) return
        enPanne = true
        console.error("[fil] abonnement", statut, erreur?.message ?? "")
      })
    })()

    return () => {
      vivant = false
      veille.subscription.unsubscribe()
      if (canal) void supabase.removeChannel(canal)
    }
  }, [conversationId, moi])

  // ── Ce qui s'affiche ────────────────────────────────────────────────────
  const fil = useMemo(() => {
    const vus = new Set(messages.map((m) => m.id))
    const nouveaux = recus.filter((m) => !vus.has(m.id))
    return [...messages, ...nouveaux, ...enVol]
  }, [messages, recus, enVol])

  // Un envoi raté rend son texte. Le champ ne se vide qu'en cas de succès :
  // le vider quoi qu'il arrive, c'est faire réécrire un message qu'on croyait
  // parti.
  const rate = Boolean(etat.erreur)
  useEffect(() => {
    if (!rate) return
    poserEnVol((avant) => {
      const dernier = avant.at(-1)
      if (dernier && champ.current) champ.current.value = dernier.texte
      return avant.slice(0, -1)
    })
  }, [rate, etat])

  const dernier = fil.at(-1)?.id
  useEffect(() => {
    bas.current?.scrollIntoView({ block: "end" })
  }, [dernier])

  const heure = (iso: string) =>
    new Date(iso).toLocaleTimeString(langue === "fr" ? "fr-FR" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <>
      <div className="flex flex-1 flex-col gap-2 py-2">
        {fil.length === 0 ? (
          <p className="doux text-sm leading-relaxed">{t.vide}</p>
        ) : (
          fil.map((m) => {
            const demoi = m.auteur_id === moi
            const enAttente = m.id.startsWith("en-vol:")
            return (
              <div
                key={m.id}
                className={`max-w-[82%] rounded-[12px] px-3.5 py-2.5 ${
                  demoi ? "self-end" : "self-start"
                }`}
                style={{
                  ...(demoi
                    ? {
                        background: "var(--accent)",
                        color: "var(--accent-texte)",
                      }
                    : {
                        background:
                          "color-mix(in srgb, var(--texte) 6%, var(--fond))",
                      }),
                  // Le message en attente est le même, en plus pâle : il est
                  // écrit, il n'est pas encore arrivé.
                  ...(enAttente ? { opacity: 0.6 } : {}),
                }}
              >
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed">
                  {m.texte}
                </p>
                <p className="mt-1 text-right text-[10px] opacity-60">
                  {enAttente ? d.commun.enCours : heure(m.cree_le)}
                </p>
              </div>
            )
          })
        )}
        <div ref={bas} />
      </div>

      <form
        action={action}
        onSubmit={(e) => {
          // L'exemplaire en attente est posé AVANT l'envoi : après, l'action
          // a déjà vidé le formulaire et le texte serait perdu.
          const champTexte = (
            e.currentTarget.elements.namedItem("texte") as HTMLTextAreaElement | null
          )?.value?.trim()
          if (!champTexte) return
          poserEnVol((avant) => [
            ...avant,
            {
              id: `en-vol:${Date.now()}:${avant.length}`,
              auteur_id: moi,
              texte: champTexte,
              cree_le: new Date().toISOString(),
              lu_le: null,
            },
          ])
          if (champ.current) champ.current.value = ""
        }}
        className="sticky bottom-0 flex flex-col gap-2 pb-4"
      >
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
