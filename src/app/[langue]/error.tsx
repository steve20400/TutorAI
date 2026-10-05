"use client"

import { useEffect } from "react"

import { useLangue } from "@/langues/contexte"

/**
 * Ce qui s'affiche quand un écran n'a pas pu se charger.
 *
 * Il n'y avait rien. Un chargement qui échouait laissait l'écran précédent en
 * place, exactement comme un chargement en cours — et comme un clic qui
 * n'aurait pas porté. Trois situations très différentes, un seul aspect :
 * celui d'une application qui ne répond pas.
 *
 * Les trois se distinguent maintenant. Le squelette dit « ça arrive », cet
 * écran dit « ça n'est pas arrivé, et voici le bouton pour réessayer ».
 *
 * Le détail technique part dans la console et pas à l'écran : « fetch failed »
 * n'aide personne, et le message nommerait des adresses internes.
 */
export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { d } = useLangue()
  const t = d.ecranErreur

  useEffect(() => {
    console.error("[ecran] chargement impossible :", error.message, error.digest)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 pb-10 pt-10 lg:px-6">
      <div
        aria-hidden
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--voyant) 16%, transparent)" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--voyant)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 7.5v5.5" />
          <path d="M12 16.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>

      <h1 className="text-[22px] font-medium tracking-[-0.02em]">
        {t.titre}
      </h1>

      <p className="doux max-w-prose text-sm leading-relaxed">
        {t.detail}
      </p>

      <button
        type="button"
        onClick={reset}
        className="bouton mt-1 px-5 py-3 text-[14.5px]"
      >
        {t.reessayer}
      </button>
    </div>
  )
}
