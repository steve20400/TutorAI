"use client"

import { useEffect } from "react"

/**
 * Sonne à la porte du service pendant qu'on remplit le formulaire.
 *
 * Posé sur les écrans d'authentification, et sur eux seulement : c'est le seul
 * endroit où l'on sait qu'une personne va avoir besoin du service dans la
 * minute, et où elle passe assez de temps pour que le réveil tienne dedans.
 *
 * Une fois, au montage. Le mettre sur un intervalle en ferait un maintien en
 * éveil — ce qui consommerait le quota mensuel de Render pour des visiteurs
 * qui lisent l'écran sans se connecter, et déciderait à la place de Steve
 * d'une question qui lui appartient.
 *
 * Il ne rend rien et ne dit rien. Un écran qui annoncerait « réveil du
 * service » inquiéterait sur une application qui, de son point de vue,
 * fonctionne.
 */
export function Reveil() {
  useEffect(() => {
    void fetch("/api/reveil", { cache: "no-store" }).catch(() => {})
  }, [])

  return null
}
