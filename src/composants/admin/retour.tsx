"use client"

import { useRouter } from "next/navigation"

import { useLangue } from "@/langues/contexte"

/**
 * Revenir d'où l'on vient.
 *
 * Le bouton du navigateur ou du téléphone n'est pas fiable ici : arrivé par
 * un lien direct, par une notification ou après un rechargement, il fait
 * sortir de l'application au lieu de remonter d'un cran. Sur un téléphone
 * Android, il peut même fermer l'onglet.
 *
 * Donc les deux, dans cet ordre : l'histoire du navigateur si on a vraiment
 * navigué dans l'application, et sinon la page parente — celle qui contient
 * logiquement celle-ci. On ne laisse jamais quelqu'un dans une impasse.
 *
 * Placé au-dessus de l'étiquette de rubrique, aligné avec elle : c'est là que
 * l'œil revient après avoir lu le titre, et c'est là que les rares pages qui
 * en avaient un l'avaient déjà mis.
 */
export function RetourAdmin({ vers }: { vers: string }) {
  const router = useRouter()
  const { d } = useLangue()

  return (
    <button
      type="button"
      onClick={() => {
        // `history.length` vaut 1 sur un onglet ouvert directement sur cette
        // page : il n'y a alors rien derrière, et revenir en arrière sortirait
        // du site.
        if (window.history.length > 1) router.back()
        else router.push(vers)
      }}
      className="doux -ml-1 inline-flex items-center gap-1 rounded-[8px] px-1 py-0.5 text-[12px] transition hover:opacity-100"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {d.admin.retour}
    </button>
  )
}
