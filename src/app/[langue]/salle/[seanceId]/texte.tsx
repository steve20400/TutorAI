"use client"

import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"

/**
 * La feuille d'énoncé : du texte, écrit à deux.
 *
 * ── POURQUOI ELLE EST LA DEUXIÈME ──
 *
 * Elle met à l'épreuve ce que la main levée n'éprouvait pas. Un trait fini ne
 * change plus ; un texte se modifie en son milieu, pendant que l'autre écrit
 * ailleurs. C'est le cas qui casse les éditeurs naïfs, et celui pour lequel on
 * a choisi un CRDT plutôt qu'un serveur qui arbitre.
 *
 * ── LE LIEN AVEC LE CHAMP, ET POURQUOI IL NE RÉÉCRIT PAS TOUT ──
 *
 * La tentation est d'envoyer le contenu entier à chaque frappe. Elle est
 * fausse pour deux raisons. D'abord Yjs ne saurait plus QUI a changé QUOI : il
 * verrait tout disparaître puis tout réapparaître, et deux personnes qui
 * écrivent en même temps s'effaceraient l'une l'autre. Ensuite le curseur
 * sauterait à la fin à chaque caractère de l'autre.
 *
 * On calcule donc ce qui a réellement changé — le préfixe et le suffixe
 * communs — et on n'applique que la différence. Trois lignes, et c'est ce qui
 * sépare un champ partagé d'un champ qui se bat contre lui-même.
 */
export function Texte({
  doc,
  lecture,
  placeholder,
}: {
  doc: Y.Doc
  lecture: boolean
  placeholder: string
}) {
  const champ = useRef<HTMLTextAreaElement | null>(null)
  const [valeur, poserValeur] = useState("")

  useEffect(() => {
    const texte = doc.getText("texte")

    const relire = () => {
      const t = texte.toString()
      poserValeur(t)

      // Replacer le curseur. Sans cela, chaque caractère tapé par l'autre
      // renvoie le nôtre à la fin, et on écrit à l'envers.
      const c = champ.current
      if (!c || document.activeElement !== c) return
      const debut = c.selectionStart
      const fin = c.selectionEnd
      requestAnimationFrame(() => {
        if (!champ.current) return
        champ.current.setSelectionRange(debut, fin)
      })
    }

    relire()
    texte.observe(relire)
    return () => texte.unobserve(relire)
  }, [doc])

  function saisir(nouveau: string) {
    const texte = doc.getText("texte")
    const ancien = texte.toString()
    if (ancien === nouveau) return

    // Ce qui n'a pas bougé au début, puis ce qui n'a pas bougé à la fin. Ce
    // qui reste entre les deux est la seule chose à transmettre.
    let avant = 0
    const court = Math.min(ancien.length, nouveau.length)
    while (avant < court && ancien[avant] === nouveau[avant]) avant++

    let apres = 0
    while (
      apres < court - avant &&
      ancien[ancien.length - 1 - apres] === nouveau[nouveau.length - 1 - apres]
    ) {
      apres++
    }

    const retires = ancien.length - avant - apres
    doc.transact(() => {
      if (retires > 0) texte.delete(avant, retires)
      const ajoutes = nouveau.slice(avant, nouveau.length - apres)
      if (ajoutes) texte.insert(avant, ajoutes)
    })
  }

  return (
    <textarea
      ref={champ}
      value={valeur}
      readOnly={lecture}
      placeholder={placeholder}
      onChange={(e) => saisir(e.target.value)}
      spellCheck={false}
      className="absolute inset-0 h-full w-full resize-none border-0 bg-transparent p-4 text-[14.5px] leading-[1.7] outline-none"
      style={{ color: "#e6ecf7", fontFamily: "ui-monospace, monospace" }}
    />
  )
}
