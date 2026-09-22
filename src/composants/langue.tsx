"use client"

import { usePathname, useRouter } from "next/navigation"

import { LANGUES, dictionnaire, cheminSansLangue } from "@/langues"
import { useLangue } from "@/langues/contexte"

/**
 * Bascule français / anglais.
 *
 * Elle reste sur la même page : on remplace le segment de langue dans
 * l'adresse au lieu de renvoyer à l'accueil. Un parent qui découvre en cours
 * d'inscription que l'application existe dans sa langue ne doit pas perdre ce
 * qu'il a déjà saisi — d'où `router.replace`, qui n'empile pas d'entrée dans
 * l'historique.
 */
export function BasculeLangue() {
  const { langue, d } = useLangue()
  const chemin = usePathname()
  const router = useRouter()

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={d.commun.changerLangue}
    >
      {LANGUES.map((cible) => {
        const actif = cible === langue
        return (
          <button
            key={cible}
            type="button"
            lang={dictionnaire(cible).meta.htmlLang}
            aria-current={actif ? "true" : undefined}
            onClick={() =>
              actif
                ? undefined
                : router.replace(`/${cible}${cheminSansLangue(chemin)}`)
            }
            className="rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em] transition"
            style={{
              color: actif ? "var(--texte)" : "var(--texte-doux)",
              background: actif
                ? "color-mix(in srgb, var(--texte) 9%, transparent)"
                : "transparent",
            }}
          >
            {dictionnaire(cible).meta.nomCourt}
          </button>
        )
      })}
    </div>
  )
}
