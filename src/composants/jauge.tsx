"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Ce qu'il reste, et ce que ça veut dire.
 *
 * Une barre horizontale nue ne dit rien : on ne sait pas si c'est un
 * ascenseur, un chargement ou une limite. C'était le cas sur l'écran d'essai,
 * et personne n'aurait compris qu'elle parlait de jetons.
 *
 * Donc un cercle, discret, qui se remplit — et qui s'ouvre au clic sur une
 * phrase qui dit de quoi il s'agit. Le cercle seul intrigue sans gêner ; la
 * phrase répond quand on la cherche.
 *
 * Une seule jauge, jamais quatre. Un élève n'a pas à comprendre une
 * comptabilité : il a besoin de savoir s'il peut continuer.
 */
export function Jauge({
  part,
  titre,
  description,
  etiquette,
  children,
}: {
  /** Ce qui reste, de 0 à 100. */
  part: number
  titre: string
  description: string
  /** Pour qui n'a pas la vue : ce que le bouton ouvre. */
  etiquette: string
  /** Ce qui s'ajoute sous la jauge — le choix du parent, par exemple. */
  children?: React.ReactNode
}) {
  const [ouvert, setOuvert] = useState(false)
  const cadre = useRef<HTMLDivElement>(null)

  // Refermer en cliquant ailleurs, et à la touche d'échappement : un panneau
  // qu'on ne sait pas fermer est un panneau qu'on n'ouvre plus.
  useEffect(() => {
    if (!ouvert) return

    const dehors = (e: MouseEvent) => {
      if (!cadre.current?.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false)
    }

    document.addEventListener("mousedown", dehors)
    document.addEventListener("keydown", echap)
    return () => {
      document.removeEventListener("mousedown", dehors)
      document.removeEventListener("keydown", echap)
    }
  }, [ouvert])

  const sur = Math.max(0, Math.min(100, part))

  // Un anneau plutôt qu'un disque : le disque plein ne montre pas le reste,
  // et c'est le reste qui intéresse.
  const rayon = 7
  const tour = 2 * Math.PI * rayon

  return (
    <div ref={cadre} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-label={etiquette}
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-100"
        style={{ opacity: ouvert ? 1 : 0.65 }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r={rayon}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            opacity="0.2"
          />
          <circle
            cx="10"
            cy="10"
            r={rayon}
            fill="none"
            stroke={sur <= 15 ? "var(--erreur-texte)" : "var(--accent)"}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray={tour}
            strokeDashoffset={tour * (1 - sur / 100)}
            // On part du haut : un anneau qui se vide depuis la droite se lit
            // comme une horloge, pas comme une réserve.
            transform="rotate(-90 10 10)"
            style={{ transition: "stroke-dashoffset .5s ease" }}
          />
        </svg>
      </button>

      {ouvert ? (
        <div
          className="absolute bottom-10 right-0 z-30 w-[min(19rem,calc(100vw-2.5rem))] rounded-[12px] p-4 shadow-lg"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--bordure)",
          }}
        >
          <div className="text-[13px] font-medium">{titre}</div>

          <div
            className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full"
            style={{
              background: "color-mix(in srgb, var(--texte) 10%, transparent)",
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${sur}%`,
                background:
                  sur <= 15 ? "var(--erreur-texte)" : "var(--accent)",
              }}
            />
          </div>

          <p className="doux mt-2 text-[12px] leading-relaxed">{description}</p>

          {children ? (
            <div
              className="mt-3 border-t pt-3"
              style={{ borderColor: "var(--bordure)" }}
            >
              {children}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
