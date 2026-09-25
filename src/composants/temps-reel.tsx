"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

import { supabaseNavigateur } from "@/lib/supabase/client"

/**
 * Écouter la base, et rafraîchir l'écran quand elle bouge.
 *
 * Jusqu'ici, une demande de rattachement n'apparaissait qu'au chargement
 * suivant. Un enfant connecté ne voyait rien arriver ; un adulte ne voyait pas
 * l'acceptation. Il fallait se déconnecter ou recharger pour découvrir ce qui
 * s'était passé — c'est-à-dire deviner qu'il s'était passé quelque chose.
 *
 * Supabase publie les changements de table en direct, par-dessus WebSocket, et
 * la RLS s'y applique : chacun ne reçoit que les lignes qu'il a déjà le droit
 * de lire. Pas de serveur à tenir nous-mêmes, pas de second chemin d'accès aux
 * données à sécuriser.
 *
 * On ne transporte pas la donnée reçue jusqu'à l'écran : on appelle
 * `router.refresh()`, et les composants serveur refont leur travail avec les
 * mêmes requêtes qu'au premier rendu. Une seule source de vérité, et rien à
 * garder d'accord entre le rendu initial et les mises à jour.
 *
 * Le rafraîchissement est retardé d'un instant : une acceptation écrit dans
 * deux tables à la suite, et rafraîchir deux fois de suite afficherait un état
 * intermédiaire avant le bon.
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
    const canal = supabase.channel(`temps-reel:${cle}:${filtre ?? "tout"}`)

    for (const table of cle.split(",")) {
      canal.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filtre ? { filter: filtre } : {}) },
        () => {
          if (minuterie.current) clearTimeout(minuterie.current)
          minuterie.current = setTimeout(() => router.refresh(), delai)
        },
      )
    }

    canal.subscribe()

    return () => {
      if (minuterie.current) clearTimeout(minuterie.current)
      void supabase.removeChannel(canal)
    }
  }, [cle, filtre, delai, router])

  return null
}
