"use client"

import { useEffect, useState } from "react"

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
