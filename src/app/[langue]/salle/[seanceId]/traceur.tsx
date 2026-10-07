"use client"

import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"

import { lireExpression } from "@/lib/salle/expression"
import { type Dictionnaire } from "@/langues"

/**
 * Le traceur de courbes.
 *
 * ── C'EST ICI QUE LE PRINCIPE SE VOIT ──
 *
 * On synchronise l'INTENTION, pas l'image. Ce qui part sur le réseau, c'est la
 * chaîne `(2x+1)/(x-1)` — vingt-et-un octets — et chaque navigateur redessine
 * la courbe de son côté. La même chose en image ferait des centaines de
 * milliers d'octets, et sur une connexion à 30 kbit/s la séance s'arrêterait
 * là.
 *
 * La conséquence va plus loin qu'une économie : l'élève peut déplacer la vue,
 * zoomer, regarder ailleurs sur la même courbe, sans rien demander à personne.
 * Une image ne se zoome pas, elle se pixellise.
 *
 * ── L'EXPRESSION N'EST JAMAIS EXÉCUTÉE ──
 *
 * Elle vient de l'autre côté du réseau. `lireExpression` ne connaît que des
 * nombres, `x`, cinq opérateurs et une liste fermée de fonctions ; tout le
 * reste est refusé. Sur une plateforme où un adulte et un mineur partagent une
 * salle, `eval` serait exactement la porte qu'il ne faut pas laisser.
 *
 * ── LA FENÊTRE EST PARTAGÉE, LES COURBES AUSSI ──
 *
 * Les deux dans le document Yjs : si le répétiteur zoome sur l'asymptote et
 * que l'élève reste sur la vue d'ensemble, « regarde ici » ne désigne rien.
 */

type Courbe = { expr: string; couleur: string }
type Vue = { xmin: number; xmax: number; ymin: number; ymax: number }

const VUE_INITIALE: Vue = { xmin: -10, xmax: 10, ymin: -6, ymax: 6 }

export function Traceur({
  doc,
  couleur,
  lecture,
  d,
}: {
  doc: Y.Doc
  couleur: string
  lecture: boolean
  d: Dictionnaire
}) {
  const t = d.salle
  const toile = useRef<HTMLCanvasElement | null>(null)
  const cadre = useRef<HTMLDivElement | null>(null)
  const [saisie, poserSaisie] = useState("")
  const [, redessiner] = useState(0)

  const courbes = doc.getArray<Courbe>("courbes")
  const vueY = doc.getMap<number>("vue")

  const vue: Vue = {
    xmin: vueY.get("xmin") ?? VUE_INITIALE.xmin,
    xmax: vueY.get("xmax") ?? VUE_INITIALE.xmax,
    ymin: vueY.get("ymin") ?? VUE_INITIALE.ymin,
    ymax: vueY.get("ymax") ?? VUE_INITIALE.ymax,
  }

  useEffect(() => {
    const rafraichir = () => redessiner((n) => n + 1)
    const a = doc.getArray("courbes")
    const m = doc.getMap("vue")
    a.observe(rafraichir)
    m.observe(rafraichir)
    return () => {
      a.unobserve(rafraichir)
      m.unobserve(rafraichir)
    }
  }, [doc])

  // ── Le dessin ───────────────────────────────────────────────────────────
  useEffect(() => {
    const c = toile.current
    const boite = cadre.current
    if (!c || !boite) return

    const dessiner = () => {
      const L = boite.clientWidth
      const H = boite.clientHeight
      const densite = Math.min(window.devicePixelRatio || 1, 2)
      if (c.width !== L * densite || c.height !== H * densite) {
        c.width = L * densite
        c.height = H * densite
      }
      const ctx = c.getContext("2d")
      if (!ctx) return
      ctx.setTransform(densite, 0, 0, densite, 0, 0)
      ctx.clearRect(0, 0, L, H)

      const versX = (x: number) => ((x - vue.xmin) / (vue.xmax - vue.xmin)) * L
      const versY = (y: number) => H - ((y - vue.ymin) / (vue.ymax - vue.ymin)) * H

      // Le quadrillage, à peine visible. Sur un plan sombre tout ressort :
      // un quadrillage franc se met devant la courbe qu'il sert.
      const pas = choisirLePas(vue.xmax - vue.xmin)
      ctx.lineWidth = 1
      ctx.strokeStyle = "rgba(143,164,201,0.12)"
      ctx.beginPath()
      for (let x = Math.ceil(vue.xmin / pas) * pas; x <= vue.xmax; x += pas) {
        ctx.moveTo(versX(x), 0)
        ctx.lineTo(versX(x), H)
      }
      for (let y = Math.ceil(vue.ymin / pas) * pas; y <= vue.ymax; y += pas) {
        ctx.moveTo(0, versY(y))
        ctx.lineTo(L, versY(y))
      }
      ctx.stroke()

      // Les axes, deux tons plus clairs que le quadrillage. Jamais blancs :
      // ils situent, ils ne se lisent pas.
      ctx.strokeStyle = "rgba(143,164,201,0.45)"
      ctx.beginPath()
      ctx.moveTo(0, versY(0))
      ctx.lineTo(L, versY(0))
      ctx.moveTo(versX(0), 0)
      ctx.lineTo(versX(0), H)
      ctx.stroke()

      // Les courbes.
      for (const courbe of courbes.toArray()) {
        const f = lireExpression(courbe.expr)
        if (!f) continue
        ctx.strokeStyle = courbe.couleur
        ctx.lineWidth = 2
        ctx.beginPath()

        let crayonLeve = true
        let precedent = NaN
        for (let px = 0; px <= L; px++) {
          const x = vue.xmin + (px / L) * (vue.xmax - vue.xmin)
          const y = f(x)

          if (!Number.isFinite(y)) {
            crayonLeve = true
            precedent = NaN
            continue
          }

          // Un saut vertical énorme est une asymptote, pas un trait. La
          // relier dessinerait une barre verticale qui n'existe pas, et c'est
          // précisément ce qu'on enseigne à ne pas croire.
          const hauteur = vue.ymax - vue.ymin
          if (!crayonLeve && Math.abs(y - precedent) > hauteur) {
            crayonLeve = true
          }

          const py = versY(y)
          if (crayonLeve) {
            ctx.moveTo(px, py)
            crayonLeve = false
          } else {
            ctx.lineTo(px, py)
          }
          precedent = y
        }
        ctx.stroke()
      }
    }

    dessiner()
    const observateur = new ResizeObserver(dessiner)
    observateur.observe(boite)
    return () => observateur.disconnect()
  })

  // ── Les gestes sur la vue ───────────────────────────────────────────────
  function poserVue(v: Vue) {
    if (lecture) return
    doc.transact(() => {
      vueY.set("xmin", v.xmin)
      vueY.set("xmax", v.xmax)
      vueY.set("ymin", v.ymin)
      vueY.set("ymax", v.ymax)
    })
  }

  function zoomer(facteur: number) {
    const cx = (vue.xmin + vue.xmax) / 2
    const cy = (vue.ymin + vue.ymax) / 2
    const lx = ((vue.xmax - vue.xmin) * facteur) / 2
    const ly = ((vue.ymax - vue.ymin) * facteur) / 2
    poserVue({ xmin: cx - lx, xmax: cx + lx, ymin: cy - ly, ymax: cy + ly })
  }

  const valide = saisie.trim() !== "" && lireExpression(saisie) !== null

  return (
    <div className="absolute inset-0 flex flex-col">
      <div ref={cadre} className="relative min-h-0 flex-1">
        <canvas ref={toile} className="h-full w-full" />
      </div>

      {/* Les courbes posées, et de quelle main elles viennent. */}
      {courbes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          {courbes.toArray().map((c, i) => (
            <span
              key={`${c.expr}-${i}`}
              className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px]"
              style={{ background: "#141f36", color: c.couleur }}
            >
              <span className="font-mono">{c.expr}</span>
              {!lecture ? (
                <button
                  type="button"
                  onClick={() => courbes.delete(i, 1)}
                  aria-label={t.retirerCourbe}
                  style={{ color: "#8fa4c9" }}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {!lecture ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!valide) return
            courbes.push([{ expr: saisie.trim(), couleur }])
            poserSaisie("")
          }}
          className="flex items-center gap-2 px-3 pb-2"
        >
          <span className="shrink-0 font-mono text-[12.5px]" style={{ color: "#8fa4c9" }}>
            f(x) =
          </span>
          <input
            value={saisie}
            onChange={(e) => poserSaisie(e.target.value)}
            placeholder={t.traceurPlaceholder}
            spellCheck={false}
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-[6px] px-2.5 py-1.5 font-mono text-[12.5px] outline-none"
            style={{
              background: "#141f36",
              color: "#e6ecf7",
              // Rouge seulement quand on a écrit quelque chose : un champ vide
              // n'est pas une erreur, c'est un champ vide.
              border:
                saisie.trim() && !valide
                  ? "1px solid #e04a32"
                  : "1px solid transparent",
            }}
          />
          <button
            type="submit"
            disabled={!valide}
            className="shrink-0 rounded-[6px] px-3 py-1.5 text-[12px] disabled:opacity-40"
            style={{ background: "#16223a", color: "#e6ecf7" }}
          >
            {t.tracer}
          </button>
          <button
            type="button"
            onClick={() => zoomer(1.4)}
            className="shrink-0 rounded-[6px] px-2.5 py-1.5 text-[12px]"
            style={{ background: "#16223a", color: "#e6ecf7" }}
            aria-label={t.dezoomer}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoomer(1 / 1.4)}
            className="shrink-0 rounded-[6px] px-2.5 py-1.5 text-[12px]"
            style={{ background: "#16223a", color: "#e6ecf7" }}
            aria-label={t.zoomer}
          >
            +
          </button>
        </form>
      ) : null}
    </div>
  )
}

/**
 * Un pas de quadrillage lisible : 1, 2, 5, 10, 20, 50…
 *
 * Un pas calculé au plus juste donnerait 0,37 puis 0,74, et des graduations
 * qu'on ne sait pas lire. On arrondit à la puissance de dix la plus proche,
 * multipliée par 1, 2 ou 5 — les trois seuls pas qu'un œil compte sans
 * réfléchir.
 */
function choisirLePas(etendue: number): number {
  const brut = etendue / 10
  const puissance = Math.pow(10, Math.floor(Math.log10(brut)))
  const reste = brut / puissance
  if (reste < 1.5) return puissance
  if (reste < 3.5) return 2 * puissance
  if (reste < 7.5) return 5 * puissance
  return 10 * puissance
}
