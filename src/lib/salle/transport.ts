import * as Y from "yjs"
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness"

import { supabaseNavigateur } from "@/lib/supabase/client"
import { depuisHexa, enHexa, enOctets, enTexte } from "./octets"

/**
 * Le transport d'un document Yjs par Supabase Realtime.
 *
 * ── CE QUE YJS APPORTE, ET POURQUOI C'EST LUI ──
 *
 * Yjs est un CRDT : chaque navigateur garde sa copie du document, et deux
 * copies modifiées séparément savent fusionner sans qu'aucun serveur
 * n'arbitre. C'est pour ça qu'on l'a choisi contre la transformation
 * opérationnelle de Google Sheets — **au Cameroun la coupure réseau est le
 * quotidien**. L'élève continue d'écrire pendant la coupure, le répétiteur
 * aussi, et tout se recolle au retour sans conflit ni perte.
 *
 * ── POURQUOI PAS UN SERVEUR WEBSOCKET ──
 *
 * La note du 22 septembre prévoyait `y-websocket` sur le service Render. On y
 * renonce : Render endort un service gratuit au bout de quinze minutes, et une
 * salle qui meurt au milieu d'un cours est pire que pas de salle. Le service
 * est d'ailleurs sans mémoire — une requête, une réponse — alors qu'un serveur
 * de synchronisation vit en continu. Supabase Realtime est déjà là, déjà
 * authentifié, déjà gouverné par les mêmes politiques, et il vit dans le
 * Supabase auto-hébergé prévu pour le VPS.
 *
 * ── CE QUE CE MODULE FAIT, EXACTEMENT ──
 *
 * Il relie trois choses qui ne se connaissent pas : un document Yjs, un canal
 * Supabase, et une ligne de la table `feuilles`.
 *
 * 1. À l'arrivée, il charge l'état enregistré. Sans cela, on ouvrirait une
 *    feuille vide sur un cahier plein.
 * 2. Il annonce sa présence et DEMANDE l'état des autres. Celui qui arrive en
 *    second n'a pas vu passer les mises à jour d'avant : sans cette demande,
 *    il ne verrait que ce qui s'écrit à partir de maintenant.
 * 3. Il diffuse ses propres mises à jour, et applique celles qu'il reçoit.
 * 4. Il enregistre, mais pas à chaque trait : voir `ENREGISTREMENT_MS`.
 *
 * ── L'ENCODAGE, ET POURQUOI IL FAUT EN PARLER ──
 *
 * Yjs produit des octets. Supabase Realtime transporte du JSON. On encode donc
 * en base64, ce qui coûte un tiers de volume — et c'est accepté en
 * connaissance de cause : un trait de stylet fait quelques dizaines d'octets,
 * un tiers de quelques dizaines reste quelques dizaines. Ce qu'on ne fait
 * JAMAIS, c'est transmettre une image : on synchronise l'intention, pas le
 * dessin.
 */

/**
 * Deux secondes entre deux enregistrements.
 *
 * Écrire à chaque mise à jour voudrait dire une écriture en base par trait de
 * stylet — des dizaines par seconde. Écrire seulement à la fermeture perdrait
 * tout sur une coupure, c'est-à-dire précisément dans le cas qu'on protège.
 * Deux secondes : on perd au pire deux secondes de cours, et la base respire.
 */
const ENREGISTREMENT_MS = 2000

/** Les trois messages qui circulent sur le canal. */
type Message =
  | { type: "maj"; charge: string }
  | { type: "presence"; charge: string }
  /** « Je viens d'arriver, envoyez-moi ce que vous avez. » */
  | { type: "bonjour" }

export type EtatTransport = "ouvert" | "attente" | "ferme"

export type Salon = {
  doc: Y.Doc
  presence: Awareness
  /** Détache tout : canal, écoutes, minuterie — et enregistre une dernière fois. */
  fermer: () => Promise<void>
}

/**
 * Ouvre une feuille : son document, son canal, et sa sauvegarde.
 *
 * `surEtat` est appelé à chaque changement de l'état du canal. L'écran doit
 * pouvoir dire « hors ligne, vos traits sont gardés » — c'est la différence
 * entre une application qui a l'air cassée et une qui tient sa promesse.
 */
export async function ouvrirFeuille({
  feuilleId,
  seanceId,
  moi,
  surEtat,
}: {
  feuilleId: string
  seanceId: string
  /** Ce que les autres verront de nous : prénom et couleur. */
  moi: { nom: string; couleur: string }
  surEtat?: (etat: EtatTransport) => void
}): Promise<Salon> {
  const supabase = supabaseNavigateur()
  const doc = new Y.Doc()
  const presence = new Awareness(doc)
  presence.setLocalStateField("qui", moi)

  // ── 1. L'état enregistré ────────────────────────────────────────────────
  //
  // Avant toute écoute : appliquer un état ancien APRÈS avoir reçu des mises à
  // jour fraîches ne casse rien chez Yjs — il fusionne — mais fait clignoter
  // l'écran, et on verrait la feuille se remplir deux fois.
  try {
    const { data } = await supabase
      .from("feuilles")
      .select("etat")
      .eq("id", feuilleId)
      .maybeSingle()

    const brut = (data as { etat?: string | null } | null)?.etat
    if (brut) {
      // PostgREST rend un `bytea` en hexadécimal préfixé `\x`.
      Y.applyUpdate(
        doc,
        brut.startsWith("\\x") ? depuisHexa(brut) : enOctets(brut),
        "base",
      )
    }
  } catch (erreur) {
    // On ouvre quand même, sur une feuille vide. Le dire, parce qu'une feuille
    // vide qui devrait être pleine ne se distingue pas d'une feuille neuve.
    console.error("[salle] état enregistré illisible :", erreur)
  }

  // ── 2. Le canal ─────────────────────────────────────────────────────────
  const canal = supabase.channel(`salle:${seanceId}:${feuilleId}`, {
    config: { broadcast: { self: false } },
  })

  function diffuser(message: Message) {
    void canal.send({ type: "broadcast", event: "y", payload: message })
  }

  // `origine` distingue ce qui vient de nous de ce qui vient du réseau : sans
  // elle, appliquer une mise à jour reçue la rediffuserait aussitôt, et les
  // deux navigateurs se renverraient la balle indéfiniment.
  doc.on("update", (maj: Uint8Array, origine: unknown) => {
    if (origine === "reseau" || origine === "base") return
    diffuser({ type: "maj", charge: enTexte(maj) })
  })

  presence.on("update", (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
  ) => {
    const changes = [...added, ...updated, ...removed]
    diffuser({
      type: "presence",
      charge: enTexte(encodeAwarenessUpdate(presence, changes)),
    })
  })

  canal.on("broadcast", { event: "y" }, ({ payload }) => {
    const message = payload as Message
    try {
      if (message.type === "maj") {
        Y.applyUpdate(doc, enOctets(message.charge), "reseau")
        return
      }
      if (message.type === "presence") {
        applyAwarenessUpdate(presence, enOctets(message.charge), "reseau")
        return
      }
      // Quelqu'un vient d'arriver : on lui envoie tout ce qu'on a. Chacun
      // répond, et Yjs fusionne les doublons sans y penser — c'est le propre
      // d'un CRDT, et c'est ce qui rend cette poignée de main si courte.
      if (message.type === "bonjour") {
        diffuser({ type: "maj", charge: enTexte(Y.encodeStateAsUpdate(doc)) })
        diffuser({
          type: "presence",
          charge: enTexte(
            encodeAwarenessUpdate(presence, [doc.clientID]),
          ),
        })
      }
    } catch (erreur) {
      console.error("[salle] message illisible :", erreur)
    }
  })

  canal.subscribe((statut) => {
    if (statut === "SUBSCRIBED") {
      surEtat?.("ouvert")
      // On demande l'état des autres APRÈS s'être abonné : avant, on
      // n'entendrait pas la réponse.
      diffuser({ type: "bonjour" })
      return
    }
    surEtat?.(statut === "CLOSED" ? "ferme" : "attente")
  })

  // ── 3. L'enregistrement ─────────────────────────────────────────────────
  let aEcrire = false
  const minuterie = setInterval(() => {
    if (!aEcrire) return
    aEcrire = false
    void enregistrer(doc, feuilleId)
  }, ENREGISTREMENT_MS)

  doc.on("update", (_maj: Uint8Array, origine: unknown) => {
    // Ce qui vient de la base n'a pas à y retourner.
    if (origine !== "base") aEcrire = true
  })

  return {
    doc,
    presence,
    async fermer() {
      clearInterval(minuterie)
      presence.destroy()
      await supabase.removeChannel(canal)
      // Un dernier enregistrement, toujours : fermer l'onglet ne doit pas
      // coûter les deux dernières secondes.
      await enregistrer(doc, feuilleId)
      doc.destroy()
    },
  }
}

/**
 * Écrit l'état complet du document.
 *
 * L'état entier et non le dernier delta : on garde un instantané, pas un
 * journal. Yjs sait rejouer son histoire, mais la conserver ferait grossir la
 * ligne sans fin pour une séance d'une heure.
 */
async function enregistrer(doc: Y.Doc, feuilleId: string): Promise<void> {
  try {
    const supabase = supabaseNavigateur()
    const octets = Y.encodeStateAsUpdate(doc)
    const { error } = await supabase
      .from("feuilles")
      .update({ etat: enHexa(octets), maj_le: new Date().toISOString() })
      .eq("id", feuilleId)

    if (error) throw error
  } catch (erreur) {
    // Bruyant, et sans interrompre la séance : ce qui est à l'écran reste
    // juste, et la prochaine tentative repartira du document complet.
    console.error("[salle] enregistrement impossible :", erreur)
  }
}
