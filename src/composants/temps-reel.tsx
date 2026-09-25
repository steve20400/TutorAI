"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

import { supabaseNavigateur } from "@/lib/supabase/client"

/**
 * Écouter la base, et rafraîchir l'écran quand elle bouge.
 *
 * Supabase publie les changements de table sur un WebSocket permanent, et la
 * RLS s'y applique : chacun ne reçoit que les lignes qu'il a déjà le droit de
 * lire. C'est aussi un composant libre de la pile Supabase, présent dans
 * l'auto-hébergement — le jour du VPS, ce fichier ne changera pas.
 *
 * On ne transporte pas la donnée reçue jusqu'à l'écran : on appelle
 * `router.refresh()`, et les composants serveur refont leur travail avec les
 * mêmes requêtes qu'au premier rendu. Une seule source de vérité, et rien à
 * garder d'accord entre le rendu initial et les mises à jour.
 *
 * ── Le jeton, et pourquoi la première version ne marchait pas ──
 *
 * S'abonner dès le montage ouvrait le canal AVANT que le client ait fini de
 * lire la session dans les témoins. Le socket se connectait donc en anonyme,
 * et comme la RLS s'applique au canal, un anonyme ne reçoit aucune ligne :
 * tout paraissait branché, rien n'arrivait, et il fallait recharger la page —
 * c'est-à-dire exactement ce qu'on voulait supprimer.
 *
 * On attend donc la session, on pose le jeton sur le canal, et on la repose à
 * chaque renouvellement : un jeton d'accès vit une heure, et le socket d'une
 * séance de travail vit plus longtemps que ça.
 *
 * Et on lit le résultat de `subscribe()`. Un abonnement refusé se taisait.
 */
export function TempsReel({
  tables,
  filtre,
  delai = 250,
}: {
  /** Les tables à écouter. */
  tables: string[]
  /** Par exemple `eleve_id=eq.<uuid>` — la RLS reste le vrai garde-fou. */
  filtre?: string
  delai?: number
}) {
  const router = useRouter()
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Les tableaux changent d'identité à chaque rendu : sans cela, l'abonnement
  // se défaisait et se refaisait en boucle.
  const cle = tables.join(",")

  useEffect(() => {
    const supabase = supabaseNavigateur()
    let vivant = true
    let canal: ReturnType<typeof supabase.channel> | null = null

    // Le jeton suit ses renouvellements. Sans cela, le canal continue de
    // tourner avec un jeton périmé et cesse de recevoir, en silence, au bout
    // d'une heure.
    const { data: veille } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) supabase.realtime.setAuth(session.access_token)
    })

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!vivant) return

      // Un visiteur sans session n'a rien à écouter : la RLS ne lui rendrait
      // aucune ligne, et le canal ne servirait qu'à tenir un socket ouvert.
      if (!session?.access_token) return
      supabase.realtime.setAuth(session.access_token)

      canal = supabase.channel(`temps-reel:${cle}:${filtre ?? "tout"}`)

      for (const table of cle.split(",")) {
        canal.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(filtre ? { filter: filtre } : {}),
          },
          () => {
            if (minuterie.current) clearTimeout(minuterie.current)
            minuterie.current = setTimeout(() => router.refresh(), delai)
          },
        )
      }

      canal.subscribe((statut, erreur) => {
        if (statut === "SUBSCRIBED") return
        // Bruyant, et c'est voulu : un abonnement refusé rend l'écran
        // silencieusement figé, ce qui ressemble à une application qui marche.
        console.error(
          "[temps-reel] abonnement",
          statut,
          "sur",
          cle,
          erreur?.message ?? "",
        )
      })
    })()

    return () => {
      vivant = false
      veille.subscription.unsubscribe()
      if (minuterie.current) clearTimeout(minuterie.current)
      if (canal) void supabase.removeChannel(canal)
    }
  }, [cle, filtre, delai, router])

  return null
}
