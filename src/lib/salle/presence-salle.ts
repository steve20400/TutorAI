"use client"

import { useEffect, useState } from "react"

import { supabaseNavigateur } from "@/lib/supabase/client"

/**
 * Qui est dans la salle, et sur quelle feuille.
 *
 * ── POURQUOI UN SECOND CANAL ──
 *
 * La présence de Yjs vit dans le canal d'UNE feuille : celui qui regarde la
 * feuille 3 n'est pas dans le canal de la feuille 1, et reste donc invisible
 * pour qui s'y trouve. Or c'est exactement l'information dont on a besoin.
 *
 * Le piège est connu et il casse les séances en silence : le répétiteur dit
 * « regarde la courbe », l'élève est resté sur l'énoncé, et les deux parlent
 * de choses différentes pendant cinq minutes. D'où un canal de SALLE, au-dessus
 * des feuilles, qui ne porte que deux choses — un prénom et une feuille.
 *
 * ── LA PRÉSENCE DE SUPABASE, PAS CELLE DE YJS ──
 *
 * Supabase Realtime en a une, native : chacun déclare son état, et le serveur
 * tient la liste à jour, y compris quand quelqu'un ferme son onglet sans
 * prévenir. Pour « qui est là », c'est exactement l'outil. Celle de Yjs reste
 * là où elle sert : le curseur et le trait en cours, à l'intérieur d'une
 * feuille.
 */

export type QuiEstLa = {
  /** Clé stable de la personne, pour ne pas se compter soi-même. */
  id: string
  nom: string
  feuilleId: string | null
}

export function usePresenceSalle({
  seanceId,
  moi,
  feuilleId,
}: {
  seanceId: string
  moi: { id: string; nom: string }
  feuilleId: string | null
}): QuiEstLa[] {
  const [autres, poserAutres] = useState<QuiEstLa[]>([])

  useEffect(() => {
    const supabase = supabaseNavigateur()
    let vivant = true

    const canal = supabase.channel(`salle:${seanceId}:presence`, {
      config: { presence: { key: moi.id } },
    })

    const relire = () => {
      if (!vivant) return
      const etat = canal.presenceState<QuiEstLa>()
      const liste: QuiEstLa[] = []
      for (const [cle, entrees] of Object.entries(etat)) {
        if (cle === moi.id) continue
        // Plusieurs entrées pour une même personne : deux onglets ouverts. On
        // garde la dernière, sans quoi elle apparaîtrait deux fois et sur deux
        // feuilles différentes.
        const derniere = entrees[entrees.length - 1]
        if (derniere) liste.push({ ...derniere, id: cle })
      }
      poserAutres(liste)
    }

    canal
      .on("presence", { event: "sync" }, relire)
      .on("presence", { event: "join" }, relire)
      .on("presence", { event: "leave" }, relire)
      .subscribe((statut) => {
        if (statut !== "SUBSCRIBED") return
        void canal.track({ id: moi.id, nom: moi.nom, feuilleId })
      })

    return () => {
      vivant = false
      void supabase.removeChannel(canal)
    }
    // `feuilleId` est volontairement hors des dépendances : changer de feuille
    // ne doit pas défaire et refaire le canal — on se verrait partir et
    // revenir chez l'autre à chaque clic. Le second effet s'en charge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seanceId, moi.id, moi.nom])

  // Annoncer sa feuille, sans rouvrir le canal.
  useEffect(() => {
    const supabase = supabaseNavigateur()
    const canal = supabase
      .getChannels()
      .find((c) => c.topic === `realtime:salle:${seanceId}:presence`)
    if (!canal) return
    void canal.track({ id: moi.id, nom: moi.nom, feuilleId })
  }, [seanceId, moi.id, moi.nom, feuilleId])

  return autres
}
