"use client"

import { useEffect, useState } from "react"

import { useLangue } from "@/langues/contexte"
import {
  CLE_MODE,
  CLE_THEME,
  MODES,
  THEMES,
  type Mode,
  type Theme,
} from "@/lib/theme"

/**
 * Choix du thème et du mode, pour la page de réglages.
 *
 * Le choix vit dans le navigateur et non en base : il doit s'appliquer avant
 * la connexion, et il peut légitimement différer d'un appareil à l'autre —
 * le téléphone d'un élève le soir n'est pas l'ordinateur du parent au bureau.
 */
export function SelecteurTheme() {
  const [theme, poserTheme] = useState<Theme>("indigo")
  const [mode, poserMode] = useState<Mode>("systeme")

  useEffect(() => {
    const d = document.documentElement
    const t = d.getAttribute("data-theme")
    const m = d.getAttribute("data-mode")
    if (t === "indigo" || t === "foret") poserTheme(t)
    if (m === "clair" || m === "sombre") poserMode(m)
  }, [])

  function choisirTheme(valeur: Theme) {
    poserTheme(valeur)
    document.documentElement.setAttribute("data-theme", valeur)
    try {
      localStorage.setItem(CLE_THEME, valeur)
    } catch {
      // Navigation privée, stockage bloqué : le thème s'applique quand même
      // pour cette visite. Perdre la préférence est moins grave que planter.
    }
  }

  function choisirMode(valeur: Mode) {
    poserMode(valeur)
    const d = document.documentElement
    if (valeur === "systeme") d.removeAttribute("data-mode")
    else d.setAttribute("data-mode", valeur)
    try {
      if (valeur === "systeme") localStorage.removeItem(CLE_MODE)
      else localStorage.setItem(CLE_MODE, valeur)
    } catch {
      // idem
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Thème</legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.cle}
              type="button"
              onClick={() => choisirTheme(t.cle)}
              aria-pressed={theme === t.cle}
              className="pastille"
              style={
                theme === t.cle
                  ? {
                      background: "var(--accent)",
                      borderColor: "var(--accent)",
                      color: "var(--accent-texte)",
                      fontWeight: 500,
                    }
                  : undefined
              }
            >
              {t.nom}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Affichage</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.cle}
              type="button"
              onClick={() => choisirMode(m.cle)}
              aria-pressed={mode === m.cle}
              className="pastille"
              style={
                mode === m.cle
                  ? {
                      background: "var(--accent)",
                      borderColor: "var(--accent)",
                      color: "var(--accent-texte)",
                      fontWeight: 500,
                    }
                  : undefined
              }
            >
              {m.nom}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/**
 * Bascule clair / sombre, en tête de page.
 *
 * Elle ne change que le mode ; le choix entre Indigo et Forêt appartient aux
 * réglages. Deux commandes au même endroit demanderaient une réflexion à
 * quelqu'un qui veut seulement que son écran arrête de l'éblouir.
 *
 * Le pictogramme est un cercle à moitié plein, et non un soleil : un cercle
 * entouré de rayons fait partie des signes qu'on s'interdit dans ce produit.
 */
export function BasculeMode() {
  const { d } = useLangue()
  const [mode, poserMode] = useState<"clair" | "sombre" | null>(null)

  useEffect(() => {
    const attribut = document.documentElement.getAttribute("data-mode")
    if (attribut === "clair" || attribut === "sombre") return poserMode(attribut)
    poserMode(
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "sombre"
        : "clair",
    )
  }, [])

  function basculer() {
    const suivant = mode === "sombre" ? "clair" : "sombre"
    poserMode(suivant)
    document.documentElement.setAttribute("data-mode", suivant)
    try {
      localStorage.setItem(CLE_MODE, suivant)
    } catch {
      // Navigation privée : le mode s'applique pour cette visite seulement.
    }
  }

  return (
    <button
      type="button"
      onClick={basculer}
      // Tant que le mode n'est pas connu, l'intitulé reste neutre : annoncer
      // « passer en sombre » alors qu'on y est déjà induirait en erreur.
      aria-label={
        mode === null
          ? d.commun.changerAffichage
          : mode === "sombre"
            ? d.commun.affichageClair
            : d.commun.affichageSombre
      }
      className="grid h-9 w-9 place-items-center rounded-full transition hover:opacity-70"
      style={{ color: "var(--texte)" }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M12 3.4 a8.6 8.6 0 0 0 0 17.2 z" fill="currentColor" />
      </svg>
    </button>
  )
}
