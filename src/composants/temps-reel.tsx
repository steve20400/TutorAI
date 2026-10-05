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
 *
 * ── Quand la session meurt ──
 *
 * Le canal ne se rétablit JAMAIS après l'expiration d'une session. Il se
 * reconnecte en anonyme, la RLS ne lui rend rien, le serveur le refuse — et
 * `supabase-js` recommence, indéfiniment, en écrivant la même erreur à chaque
 * tour. C'est ce qu'on lisait dans la console : une cascade d'échecs
 * WebSocket qui n'annonçaient rien de nouveau, et un socket qui se rouvrait
 * en boucle sur un forfait compté au mégaoctet.
 *
 * On ferme donc le canal dès que la session disparaît. Rien n'est perdu :
 * l'écran se recharge à la navigation suivante, et le middleware renvoie vers
 * la connexion.
 *
 * ── Et quand c'est seulement le réseau ──
 *
 * Une coupure passagère est l'inverse : il FAUT laisser `supabase-js`
 * retenter, c'est son travail, et ici une connexion qui s'interrompt est la
 * règle plutôt que l'exception. On ne coupe donc rien — on se contente de ne
 * dire la panne qu'une fois, et de dire aussi le rétablissement. Vingt lignes
 * identiques dans la console ne décrivent pas vingt pannes.
 */
export function TempsReel({
  tables,
  filtre,
  echeance,
  delai = 250,
}: {
  /** Les tables à écouter. */
  tables: string[]
  /** Par exemple `eleve_id=eq.<uuid>` — la RLS reste le vrai garde-fou. */
  filtre?: string
  /**
   * Un instant à partir duquel l'écran dira quelque chose de faux.
   *
   * Une expiration n'est pas une écriture : aucun événement ne part de la
   * base quand une demande de mot de passe cesse d'être valable. La carte
   * restait donc affichée après l'heure, et menait à une zone verrouillée.
   * On pose une minuterie sur l'échéance, et on relit à ce moment-là.
   */
  echeance?: string | null
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
    // Vrai entre une panne annoncée et son rétablissement : sert à ne parler
    // qu'aux changements d'état, pas à chaque tentative.
    let enPanne = false

    function fermerLeCanal(pourquoi: string) {
      if (!canal) return
      console.warn("[temps-reel] canal fermé :", pourquoi, "—", cle)
      void supabase.removeChannel(canal)
      canal = null
    }

    // Le jeton suit ses renouvellements. Sans cela, le canal continue de
    // tourner avec un jeton périmé et cesse de recevoir, en silence, au bout
    // d'une heure.
    const { data: veille } = supabase.auth.onAuthStateChange((e, session) => {
      if (!session?.access_token) {
        // Déconnexion, ou renouvellement impossible. Le canal ne reviendra
        // pas : il se rouvrirait en anonyme, la RLS ne lui rendrait rien, et
        // la bibliothèque retenterait sans fin sur le même refus.
        vivant = false
        fermerLeCanal(e)
        return
      }
      void supabase.realtime.setAuth(session.access_token)
    })

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!vivant) return

      // Un visiteur sans session n'a rien à écouter : la RLS ne lui rendrait
      // aucune ligne, et le canal ne servirait qu'à tenir un socket ouvert.
      if (!session?.access_token) return
      void supabase.realtime.setAuth(session.access_token)

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
        if (statut === "SUBSCRIBED") {
          if (enPanne) {
            console.info("[temps-reel] canal rétabli :", cle)
            enPanne = false
          }
          return
        }

        // Une seule ligne par panne, pas une par tentative. Bruyant au
        // premier échec, et c'est voulu : un abonnement refusé rend l'écran
        // silencieusement figé, ce qui ressemble à une application qui
        // marche. Bruyant au vingtième, en revanche, ne dit plus rien.
        if (enPanne) return
        enPanne = true
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
      canal = null
    }
  }, [cle, filtre, delai, router])

  useEffect(() => {
    if (!echeance) return

    // Une seconde de marge : la base compare à `now()`, et deux horloges ne
    // tombent jamais exactement d'accord.
    const dans = new Date(echeance).getTime() - Date.now() + 1000
    if (dans <= 0) {
      router.refresh()
      return
    }

    // `setTimeout` plafonne à environ vingt-cinq jours ; au-delà, il se
    // déclenche immédiatement et en boucle. Aucune de nos échéances n'en est
    // là, mais une borne coûte une ligne.
    if (dans > 2_000_000_000) return

    const minuterie = setTimeout(() => router.refresh(), dans)
    return () => clearTimeout(minuterie)
  }, [echeance, router])

  return null
}
