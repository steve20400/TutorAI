"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export type Option = { valeur: string; libelle: string }

/**
 * Rangée de filtres qui répond au doigt.
 *
 * Des `<Link>` suffisaient à changer de filtre, mais rien ne bougeait avant
 * que le serveur réponde : sur une connexion camerounaise, on croit que le
 * clic n'a pas pris et on reclique. Chaque reclic relançait une requête.
 *
 * L'état actif passe donc sur le bouton touché sans attendre la réponse, et
 * la rangée entière se met en attente : le résultat n'est pas encore là, mais
 * la demande, elle, est bien partie. `useTransition` sait quand la navigation
 * s'achève ; `choisi` est remis à null à ce moment-là, et l'affichage revient
 * à ce que le serveur a réellement rendu.
 */
export function Filtres({
  base,
  parametre,
  actuel,
  options,
  autres = {},
  etiquette,
}: {
  base: string
  parametre: string
  actuel: string
  options: Option[]
  /** Paramètres à conserver dans l'adresse — la recherche en cours. */
  autres?: Record<string, string>
  etiquette: string
}) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  const [choisi, poserChoisi] = useState<string | null>(null)

  const montre = choisi ?? actuel

  function aller(valeur: string) {
    if (valeur === montre) return
    poserChoisi(valeur)

    const params = new URLSearchParams({ ...autres, [parametre]: valeur })
    demarrer(() => {
      router.push(`${base}?${params.toString()}`)
      // Une fois la transition terminée, l'affichage repart de `actuel`,
      // c'est-à-dire de ce que le serveur a vraiment rendu.
      poserChoisi(null)
    })
  }

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2"
      role="group"
      aria-label={etiquette}
      aria-busy={enCours}
    >
      {options.map((o) => {
        const actif = montre === o.valeur
        return (
          <button
            key={o.valeur}
            type="button"
            onClick={() => aller(o.valeur)}
            // Pendant la navigation, les autres filtres ne répondent plus :
            // c'est ce qui empêche la rafale de requêtes.
            disabled={enCours && !actif}
            aria-pressed={actif}
            className="pastille"
            style={
              actif
                ? {
                    background: "var(--accent)",
                    borderColor: "var(--accent)",
                    color: "var(--accent-texte)",
                    fontWeight: 500,
                  }
                : enCours
                  ? { opacity: 0.5 }
                  : undefined
            }
          >
            {o.libelle}
          </button>
        )
      })}

      {enCours ? <span className="rouet" aria-hidden /> : null}
    </div>
  )
}
