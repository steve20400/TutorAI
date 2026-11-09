"use client"

import { useEffect, useRef } from "react"

import { enLignes } from "@/lib/texte-riche"

// La feuille de style de KaTeX. Déclarée en haut plutôt qu'importée à la
// demande : Next l'assemble alors avec le reste du CSS de la page, en une
// seule requête. Sans elle, KaTeX rend un empilement illisible — pire que le
// LaTeX brut.
import "katex/dist/katex.min.css"

/**
 * Le texte du tuteur, formules comprises.
 *
 * Un modèle écrit les mathématiques en LaTeX : `$\frac{x^2-4}{x-2}$`. Sur
 * l'écran d'un élève, ça ne veut rien dire — et surtout pas pour un enfant de
 * cinquième, qui n'a jamais vu de sa vie une barre oblique inversée. Il faut
 * que ça s'affiche comme dans son cahier.
 *
 * KaTeX est chargé à la demande, seulement quand une formule apparaît. La
 * bibliothèque et ses polices pèsent quelques centaines de kilo-octets : les
 * faire descendre sur une connexion d'ici pour une conversation qui n'en
 * contient aucune serait du gaspillage.
 *
 * Trois façons d'écrire une formule, toutes reconnues, parce qu'un modèle
 * change d'avis d'une phrase à l'autre :
 *
 *   $x^2$            en ligne
 *   $$x^2$$          isolée, centrée
 *   \( \) et \[ \]   les formes que LaTeX préfère
 *
 * Ce qui n'est pas une formule n'est jamais touché : une somme en francs
 * « 5000 F » ne doit pas devenir une équation parce qu'elle contient un
 * chiffre.
 */

/** Découpe le texte en morceaux ordinaires et en formules. */
type Morceau =
  | { type: "texte"; valeur: string }
  | { type: "formule"; valeur: string; isolee: boolean }

export function decouper(texte: string): Morceau[] {
  const morceaux: Morceau[] = []
  // L'ordre compte : les délimiteurs doubles avant les simples, sinon `$$`
  // serait lu comme deux formules vides.
  const motif = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g

  let dernier = 0
  for (const trouve of texte.matchAll(motif)) {
    const debut = trouve.index ?? 0
    if (debut > dernier) {
      morceaux.push({ type: "texte", valeur: texte.slice(dernier, debut) })
    }

    const brut = trouve[0]
    const isolee = brut.startsWith("$$") || brut.startsWith("\\[")
    const valeur = isolee ? brut.slice(2, -2) : brut.slice(brut.startsWith("\\(") ? 2 : 1, brut.length - (brut.startsWith("\\(") ? 2 : 1))

    morceaux.push({ type: "formule", valeur: valeur.trim(), isolee })
    dernier = debut + brut.length
  }

  if (dernier < texte.length) {
    morceaux.push({ type: "texte", valeur: texte.slice(dernier) })
  }
  return morceaux
}

export function TexteMathematique({ texte }: { texte: string }) {
  const morceaux = decouper(texte)
  const aDesFormules = morceaux.some((m) => m.type === "formule")
  const conteneur = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!aDesFormules || !conteneur.current) return

    let annule = false
    void (async () => {
      const katex = await import("katex")
      if (annule || !conteneur.current) return

      for (const noeud of conteneur.current.querySelectorAll<HTMLElement>(
        "[data-formule]",
      )) {
        try {
          katex.default.render(noeud.dataset.formule ?? "", noeud, {
            displayMode: noeud.dataset.isolee === "1",
            throwOnError: false,
            // Une formule mal écrite s'affiche en rouge plutôt que de faire
            // disparaître toute la réponse du tuteur.
            errorColor: "var(--erreur-texte, #b91c1c)",
          })
        } catch {
          noeud.textContent = noeud.dataset.formule ?? ""
        }
      }
    })()

    return () => {
      annule = true
    }
  }, [texte, aDesFormules])

  return (
    <div ref={conteneur} className="leading-relaxed">
      {morceaux.map((m, i) =>
        m.type === "texte" ? (
          <Riche key={i} texte={m.valeur} />
        ) : (
          <span
            key={i}
            data-formule={m.valeur}
            data-isolee={m.isolee ? "1" : "0"}
            // Avant que KaTeX n'arrive, on montre la formule sans ses
            // délimiteurs : un élève sur une connexion lente lit « x^2 - 4 »
            // plutôt qu'une bulle vide.
            className={m.isolee ? "my-2 block text-center" : ""}
          >
            {m.valeur}
          </span>
        ),
      )}
    </div>
  )
}

/**
 * Le texte ordinaire, mis en forme.
 *
 * Gras, italique, code, puces, titres — et les correspondances de clavier
 * remplacées par les signes de l'école. Voir `lib/texte-riche.ts` pour le
 * pourquoi : un enfant du primaire doit reconnaître ce qu'il voit au tableau,
 * pas apprendre une convention avant sa leçon.
 *
 * Rendu en ligne (`display: inline`) : un morceau de texte peut être suivi
 * d'une formule dans la même phrase, et les couper en blocs ferait sauter la
 * formule à la ligne au milieu d'une explication.
 */
function Riche({ texte }: { texte: string }) {
  return (
    <>
      {enLignes(texte).map((ligne, i) => {
        if (ligne.t === "vide") return <br key={i} />

        const contenu = ligne.contenu.map((bout, j) => {
          if (bout.t === "gras") return <strong key={j} className="font-semibold">{bout.v}</strong>
          if (bout.t === "italique") return <em key={j}>{bout.v}</em>
          if (bout.t === "code") {
            return (
              <code
                key={j}
                className="rounded px-1 py-0.5 text-[0.92em]"
                style={{ background: "color-mix(in srgb, currentColor 10%, transparent)" }}
              >
                {bout.v}
              </code>
            )
          }
          return <span key={j}>{bout.v}</span>
        })

        if (ligne.t === "titre") {
          return (
            <span key={i} className="mt-2 block font-semibold">
              {contenu}
            </span>
          )
        }
        if (ligne.t === "puce") {
          return (
            <span key={i} className="flex gap-2">
              <span aria-hidden>•</span>
              <span className="min-w-0">{contenu}</span>
            </span>
          )
        }
        if (ligne.t === "numero") {
          return (
            <span key={i} className="flex gap-2">
              <span aria-hidden className="shrink-0 tabular-nums">{ligne.n}.</span>
              <span className="min-w-0">{contenu}</span>
            </span>
          )
        }
        return (
          <span key={i} className="block">
            {contenu}
          </span>
        )
      })}
    </>
  )
}
