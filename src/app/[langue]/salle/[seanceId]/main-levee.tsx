"use client"

import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"
import type { Awareness } from "y-protocols/awareness"

/**
 * La feuille à main levée, partagée.
 *
 * ── CE QU'ON TRANSMET, ET CE QU'ON NE TRANSMET JAMAIS ──
 *
 * Les POINTS du tracé, jamais l'image. Un trait de stylet fait quelques
 * dizaines d'octets ; la même chose en bitmap en ferait des centaines de
 * milliers. Sur une connexion à 30 kbit/s, c'est la différence entre une
 * séance qui marche et une séance qu'on abandonne. C'est le principe qui
 * commande toute la salle : on synchronise l'intention, pas le dessin.
 *
 * ── DEUX CHEMINS POUR UN TRAIT, ET POURQUOI ──
 *
 * Pendant qu'on dessine, le trait en cours voyage par la PRÉSENCE : c'est un
 * canal éphémère, qui ne garde rien. L'autre voit la main avancer en direct,
 * et rien de tout cela n'entre dans l'histoire du document.
 *
 * Au relâcher seulement, le trait fini entre dans le DOCUMENT. Sans cette
 * séparation, chaque mouvement du doigt écrirait une ligne d'histoire : un
 * trait en ferait cent, une séance en ferait cent mille, et le document
 * deviendrait illisible à sauvegarder.
 *
 * ── LES COORDONNÉES SONT RELATIVES ──
 *
 * Entre 0 et 1, jamais en pixels. Le répétiteur est sur un portable, l'élève
 * sur un téléphone : un point à 300 px n'est pas au même endroit chez les
 * deux. En relatif, le dessin de l'un tombe là où l'autre le voit.
 *
 * ── CHACUN SA COULEUR ──
 *
 * Le répétiteur à l'ocre, l'élève au vert. Ce n'est pas décoratif : on voit
 * qui a trouvé quoi, et c'est ce qu'un parent relit après coup. Le rouge reste
 * réservé au seul enregistrement — jamais aux erreurs, jamais aux alertes.
 */

export type Trait = {
  /** Couleur du traceur, celle de la personne. */
  c: string
  /** Épaisseur, relative à la largeur de la feuille. */
  e: number
  /** x0, y0, x1, y1… entre 0 et 1. */
  p: number[]
}

export function MainLevee({
  doc,
  presence,
  couleur,
  lecture,
}: {
  doc: Y.Doc
  presence: Awareness
  couleur: string
  /** Vrai pour qui regarde sans tenir la séance : le parent, l'administration. */
  lecture: boolean
}) {
  const toile = useRef<HTMLCanvasElement | null>(null)
  const cadre = useRef<HTMLDivElement | null>(null)
  const enCours = useRef<number[]>([])
  const [, redessiner] = useState(0)

  // ── Redessiner, à chaque changement d'un côté ou de l'autre ──────────────
  useEffect(() => {
    const traits = doc.getArray<Trait>("traits")
    const rafraichir = () => redessiner((n) => n + 1)
    traits.observe(rafraichir)
    presence.on("change", rafraichir)
    return () => {
      traits.unobserve(rafraichir)
      presence.off("change", rafraichir)
    }
  }, [doc, presence])

  useEffect(() => {
    const t = toile.current
    const boite = cadre.current
    if (!t || !boite) return

    const dessiner = () => {
      const l = boite.clientWidth
      const h = boite.clientHeight
      const densite = Math.min(window.devicePixelRatio || 1, 2)
      if (t.width !== l * densite || t.height !== h * densite) {
        t.width = l * densite
        t.height = h * densite
      }

      const ctx = t.getContext("2d")
      if (!ctx) return
      ctx.setTransform(densite, 0, 0, densite, 0, 0)
      ctx.clearRect(0, 0, l, h)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      const tracer = (trait: Trait) => {
        if (trait.p.length < 4) return
        ctx.strokeStyle = trait.c
        ctx.lineWidth = Math.max(1, trait.e * l)
        ctx.beginPath()
        ctx.moveTo(trait.p[0] * l, trait.p[1] * h)
        for (let i = 2; i < trait.p.length; i += 2) {
          ctx.lineTo(trait.p[i] * l, trait.p[i + 1] * h)
        }
        ctx.stroke()
      }

      for (const trait of doc.getArray<Trait>("traits").toArray()) tracer(trait)

      // Les traits en cours, à nous et aux autres. Ils ne sont dans aucun
      // document : ils vivent le temps du geste.
      for (const etat of presence.getStates().values()) {
        const vol = (etat as { trace?: Trait }).trace
        if (vol) tracer(vol)
      }
    }

    dessiner()
    const observateur = new ResizeObserver(dessiner)
    observateur.observe(boite)
    return () => observateur.disconnect()
  })

  // ── Le geste ────────────────────────────────────────────────────────────
  function relatif(e: React.PointerEvent): [number, number] {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height]
  }

  function commencer(e: React.PointerEvent) {
    if (lecture) return
    // Capturer le pointeur : sans cela, sortir du cadre en dessinant coupe le
    // trait au milieu, et on reprend le stylet pour finir une lettre.
    e.currentTarget.setPointerCapture(e.pointerId)
    enCours.current = relatif(e)
  }

  function avancer(e: React.PointerEvent) {
    if (lecture || enCours.current.length === 0) return
    const [x, y] = relatif(e)

    // On ne garde un point que s'il apporte quelque chose. Un stylet envoie
    // deux cents points par seconde ; en garder un sur deux ne se voit pas à
    // l'œil et divise par deux ce qui part sur le réseau.
    const n = enCours.current.length
    const dx = x - enCours.current[n - 2]
    const dy = y - enCours.current[n - 1]
    if (dx * dx + dy * dy < 0.00002) return

    enCours.current = [...enCours.current, x, y]
    presence.setLocalStateField("trace", {
      c: couleur,
      e: 0.006,
      p: enCours.current,
    })
  }

  function terminer() {
    if (lecture) return
    const points = enCours.current
    enCours.current = []
    presence.setLocalStateField("trace", null)
    // Un point isolé n'est pas un trait : c'est un doigt posé par erreur.
    if (points.length < 4) return
    doc.getArray<Trait>("traits").push([{ c: couleur, e: 0.006, p: points }])
  }

  return (
    <div ref={cadre} className="absolute inset-0">
      <canvas
        ref={toile}
        className="h-full w-full"
        // `touch-none` : sans lui, dessiner fait défiler la page sur
        // téléphone, et le trait part en diagonale dès qu'on appuie.
        style={{ touchAction: "none", cursor: lecture ? "default" : "crosshair" }}
        onPointerDown={commencer}
        onPointerMove={avancer}
        onPointerUp={terminer}
        onPointerCancel={terminer}
      />
    </div>
  )
}
