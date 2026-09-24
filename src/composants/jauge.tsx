"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

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
  const bouton = useRef<HTMLButtonElement>(null)
  const panneau = useRef<HTMLDivElement>(null)

  /**
   * Le panneau est posé sur la page entière, pas dans la conversation.
   *
   * Dans le flux, il était coupé : le fil de discussion masque ce qui dépasse,
   * et sur un téléphone étroit le panneau sortait de l'écran. Un panneau qu'on
   * ouvre et qu'on ne voit pas est pire qu'un panneau absent.
   *
   * Donc `position: fixed`, des coordonnées calculées depuis le bouton, et
   * bornées à l'écran — il ne peut plus sortir, quelle que soit la largeur.
   */
  const [place, setPlace] = useState<{ gauche: number; bas: number } | null>(null)

  const placer = useCallback(() => {
    const b = bouton.current?.getBoundingClientRect()
    if (!b) return

    const largeur = panneau.current?.offsetWidth ?? 300
    const marge = 12

    const gauche = Math.min(
      Math.max(marge, b.left),
      Math.max(marge, window.innerWidth - largeur - marge),
    )

    setPlace({ gauche, bas: window.innerHeight - b.top + 8 })
  }, [])

  useEffect(() => {
    if (!ouvert) return
    placer()

    // La barre d'adresse d'un téléphone apparaît et disparaît au défilement :
    // sans ces deux écoutes, le panneau resterait où il était et flotterait à
    // côté de son bouton.
    window.addEventListener("resize", placer)
    window.addEventListener("scroll", placer, true)
    return () => {
      window.removeEventListener("resize", placer)
      window.removeEventListener("scroll", placer, true)
    }
  }, [ouvert, placer])

  // Refermer en cliquant ailleurs, et à la touche d'échappement : un panneau
  // qu'on ne sait pas fermer est un panneau qu'on n'ouvre plus.
  useEffect(() => {
    if (!ouvert) return

    const dehors = (e: MouseEvent) => {
      const cible = e.target as Node
      // Le panneau n'est plus un descendant du cadre — il vit à la racine de
      // la page. Sans ce second test, cliquer dedans le refermerait.
      if (cadre.current?.contains(cible)) return
      if (panneau.current?.contains(cible)) return
      setOuvert(false)
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
        ref={bouton}
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

      {ouvert && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={panneau}
          role="dialog"
          aria-label={titre}
          className="fixed z-50 w-[min(19rem,calc(100vw-1.5rem))] rounded-[12px] p-4 shadow-lg"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--bordure)",
            left: place?.gauche ?? 12,
            bottom: place?.bas ?? 60,
            // Tant qu'on n'a pas mesuré, on ne montre rien : un panneau qui
            // apparaît au mauvais endroit puis saute se remarque plus qu'il
            // n'informe.
            visibility: place ? "visible" : "hidden",
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
        </div>,
        document.body,
      )
        : null}
    </div>
  )
}
