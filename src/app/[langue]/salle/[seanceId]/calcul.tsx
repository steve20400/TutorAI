"use client"

import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"
import type { Awareness } from "y-protocols/awareness"

import { type Dictionnaire } from "@/langues"

/**
 * La feuille de calcul : des lignes de mathématiques, et un clavier pour les
 * écrire.
 *
 * ── POURQUOI UN CLAVIER DE SYMBOLES ──
 *
 * Un élève de quatrième ne tape pas `\int` ni `\lim_{x \to +\infty}`. Il
 * connaît ∫ et lim, il les a vus au tableau, et il ne les trouve sur aucun
 * clavier de téléphone. Sans cette rangée, la feuille de calcul serait un
 * champ de texte où l'on écrit « limite de f quand x tend vers plus l'infini »
 * — ce qui n'est pas une ligne de calcul, c'est une phrase sur le calcul.
 *
 * Chaque touche insère le LaTeX à la place du curseur, et place le curseur là
 * où l'on va continuer d'écrire. C'est la différence entre un outil et une
 * palette de caractères.
 *
 * ── CE QUI EST PARTAGÉ, ET CE QUI NE L'EST PAS ──
 *
 * Les lignes POSÉES vivent dans le document : elles sont le cahier, elles
 * restent. La ligne EN COURS d'écriture voyage par la présence — l'autre voit
 * la formule se construire, et rien de ce tâtonnement n'entre dans l'histoire
 * du document. C'est la même règle que pour la main levée, et pour la même
 * raison : un calcul écrit en trente frappes en ferait trente lignes
 * d'histoire.
 *
 * ── LA CHASSE FIXE ──
 *
 * Pour le champ de saisie, jamais pour le rendu. On corrige un calcul, et un
 * 1 qui ressemble à un l coûte une minute à chaque fois. Le rendu, lui, est de
 * la typographie mathématique : c'est KaTeX qui s'en occupe.
 */

/** Ce que chaque touche insère, et où le curseur atterrit ensuite. */
const TOUCHES: { libelle: string; latex: string; recul?: number }[] = [
  { libelle: "½", latex: "\\frac{}{}", recul: 3 },
  { libelle: "x²", latex: "^{}", recul: 1 },
  { libelle: "√", latex: "\\sqrt{}", recul: 1 },
  { libelle: "∫", latex: "\\int_{}^{}", recul: 4 },
  { libelle: "∑", latex: "\\sum_{}^{}", recul: 4 },
  { libelle: "lim", latex: "\\lim_{x \\to }", recul: 1 },
  { libelle: "∞", latex: "\\infty " },
  { libelle: "→", latex: "\\to " },
  { libelle: "≤", latex: "\\leq " },
  { libelle: "≥", latex: "\\geq " },
  { libelle: "≠", latex: "\\neq " },
  { libelle: "∈", latex: "\\in " },
  { libelle: "∀", latex: "\\forall " },
  { libelle: "∃", latex: "\\exists " },
  { libelle: "π", latex: "\\pi " },
  { libelle: "α", latex: "\\alpha " },
  { libelle: "θ", latex: "\\theta " },
  { libelle: "×", latex: "\\times " },
]

export function Calcul({
  doc,
  presence,
  couleur,
  lecture,
  d,
}: {
  doc: Y.Doc
  presence: Awareness
  couleur: string
  lecture: boolean
  d: Dictionnaire
}) {
  const t = d.salle
  const champ = useRef<HTMLInputElement | null>(null)
  const [saisie, poserSaisie] = useState("")
  const [, redessiner] = useState(0)

  const lignes = doc.getArray<{ l: string; c: string }>("lignes")

  useEffect(() => {
    const rafraichir = () => redessiner((n) => n + 1)
    const a = doc.getArray("lignes")
    a.observe(rafraichir)
    presence.on("change", rafraichir)
    return () => {
      a.unobserve(rafraichir)
      presence.off("change", rafraichir)
    }
  }, [doc, presence])

  // La ligne en cours part par la présence : l'autre la voit se construire,
  // et rien de ce tâtonnement n'entre dans le document.
  useEffect(() => {
    if (lecture) return
    presence.setLocalStateField(
      "calcul",
      saisie.trim() ? { l: saisie, c: couleur } : null,
    )
  }, [saisie, couleur, presence, lecture])

  function inserer(touche: (typeof TOUCHES)[number]) {
    const c = champ.current
    if (!c) return
    const debut = c.selectionStart ?? saisie.length
    const fin = c.selectionEnd ?? debut
    const nouveau = saisie.slice(0, debut) + touche.latex + saisie.slice(fin)
    poserSaisie(nouveau)

    // Le curseur se place là où l'on va continuer d'écrire : dans
    // l'accolade du numérateur, sous le signe somme. Sans cela, chaque
    // symbole demanderait de replacer le curseur à la main, et le clavier
    // ferait perdre le temps qu'il est censé faire gagner.
    const position = debut + touche.latex.length - (touche.recul ?? 0)
    requestAnimationFrame(() => {
      c.focus()
      c.setSelectionRange(position, position)
    })
  }

  const enVol = [...presence.getStates().entries()]
    .filter(([id]) => id !== doc.clientID)
    .map(([, e]) => (e as { calcul?: { l: string; c: string } }).calcul)
    .filter((v): v is { l: string; c: string } => Boolean(v))

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Les lignes posées. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {lignes.length === 0 && enVol.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: "#4e5e7d" }}>
            {t.calculVide}
          </p>
        ) : null}

        {lignes.toArray().map((ligne, i) => (
          <div key={i} className="group flex items-start gap-2 py-1.5">
            <Formule latex={ligne.l} couleur={ligne.c} />
            {!lecture ? (
              <button
                type="button"
                onClick={() => lignes.delete(i, 1)}
                aria-label={t.retirerLigne}
                className="ml-auto shrink-0 px-1 text-[13px] opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                style={{ color: "#8fa4c9" }}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}

        {/* Ce que l'autre est en train d'écrire. Plus pâle : ce n'est pas
            encore posé, et le montrer comme posé ferait croire à une ligne
            qu'on pourrait effacer. */}
        {enVol.map((v, i) => (
          <div key={`vol-${i}`} className="py-1.5 opacity-50">
            <Formule latex={v.l} couleur={v.c} />
          </div>
        ))}
      </div>

      {!lecture ? (
        <>
          {/* La rangée glissante de la maquette. Trente points de côté : un
              doigt les atteint, et on en voit six à la fois sur un
              téléphone. */}
          <div
            className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-1.5"
            style={{ scrollbarWidth: "none" }}
          >
            {TOUCHES.map((touche) => (
              <button
                key={touche.libelle}
                type="button"
                onClick={() => inserer(touche)}
                className="h-[30px] min-w-[30px] shrink-0 rounded-[6px] px-1.5 text-[13px]"
                style={{ background: "#141f36", color: "#e6ecf7" }}
              >
                {touche.libelle}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const l = saisie.trim()
              if (!l) return
              lignes.push([{ l, c: couleur }])
              poserSaisie("")
              champ.current?.focus()
            }}
            className="flex shrink-0 items-center gap-2 px-3 pb-2"
          >
            <input
              ref={champ}
              value={saisie}
              onChange={(e) => poserSaisie(e.target.value)}
              placeholder={t.calculPlaceholder}
              spellCheck={false}
              autoCapitalize="none"
              className="min-w-0 flex-1 rounded-[6px] px-2.5 py-1.5 text-[12.5px] outline-none"
              style={{
                background: "#141f36",
                color: "#e6ecf7",
                // Chasse fixe à la SAISIE seulement : on corrige un calcul, et
                // un 1 qui ressemble à un l coûte une minute à chaque fois.
                fontFamily: "ui-monospace, monospace",
              }}
            />
            <button
              type="submit"
              disabled={!saisie.trim()}
              className="shrink-0 rounded-[6px] px-3 py-1.5 text-[12px] disabled:opacity-40"
              style={{ background: "#16223a", color: "#e6ecf7" }}
            >
              {t.poserLigne}
            </button>
          </form>

          {/* L'aperçu, sous le champ : on voit ce qu'on écrit avant de le
              poser. Sans lui, on pose pour voir, on efface, on recommence. */}
          {saisie.trim() ? (
            <div className="shrink-0 px-4 pb-2">
              <Formule latex={saisie} couleur={couleur} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/**
 * Une ligne rendue par KaTeX.
 *
 * Chargé à la demande : la bibliothèque pèse, et la salle s'ouvre souvent sur
 * une feuille à main levée qui n'en a aucun besoin.
 *
 * Une formule mal écrite s'affiche en rouge, elle ne fait pas disparaître la
 * ligne. Un élève qui tâtonne doit voir où il s'est trompé, pas voir son
 * travail s'évanouir.
 */
function Formule({ latex, couleur }: { latex: string; couleur: string }) {
  const noeud = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let annule = false
    void (async () => {
      const katex = await import("katex")
      if (annule || !noeud.current) return
      try {
        katex.default.render(latex, noeud.current, {
          throwOnError: false,
          errorColor: "#e04a32",
        })
      } catch {
        noeud.current.textContent = latex
      }
    })()
    return () => {
      annule = true
    }
  }, [latex])

  return (
    <span
      ref={noeud}
      className="text-[15px]"
      style={{ color: couleur }}
      // Le LaTeX brut en attendant que KaTeX arrive : sur une connexion lente,
      // une ligne vide pendant deux secondes ressemble à une ligne perdue.
    >
      {latex}
    </span>
  )
}
