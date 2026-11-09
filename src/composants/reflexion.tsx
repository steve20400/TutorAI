"use client"

import { useLangue } from "@/langues/contexte"

/**
 * « Le tuteur réfléchit… », à la place où la réponse arrivera.
 *
 * Il y avait un cercle de quatorze pixels, pâle, seul au bord de l'écran. On
 * ne le voyait pas : la fenêtre avait l'air figée pendant que le tuteur
 * cherchait, et on finissait par renvoyer sa question — donc par consommer
 * deux fois des jetons pour la même réponse.
 *
 * Une bulle, au même endroit et de la même forme que la réponse à venir, dit
 * deux choses d'un coup : ça travaille, et ça arrivera ICI. Les trois points
 * donnent le mouvement, le texte donne le sens — un enfant qui ne décode pas
 * l'animation lit la phrase.
 *
 * `aria-live="polite"` : un lecteur d'écran l'annonce sans couper ce qu'il
 * est en train de dire.
 */
export function Reflexion() {
  const { d } = useLangue()

  return (
    <div
      aria-live="polite"
      className="flex max-w-[92%] items-center gap-2.5 self-start rounded-2xl rounded-bl-sm px-4 py-3"
      style={{
        background: "color-mix(in srgb, var(--texte) 6%, var(--fond))",
        color: "var(--texte-doux)",
      }}
    >
      <span className="points-reflexion flex items-center gap-1" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="text-[12.5px]">{d.commun.reflexion}</span>
    </div>
  )
}
