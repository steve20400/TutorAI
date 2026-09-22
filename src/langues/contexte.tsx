"use client"

import { createContext, useContext } from "react"

import type { Dictionnaire, Langue } from "./index"

type Valeur = { langue: Langue; d: Dictionnaire }

const Contexte = createContext<Valeur | null>(null)

/**
 * Met la langue et les textes à disposition des composants client.
 *
 * Les composants serveur lisent le dictionnaire directement depuis leurs
 * paramètres de route ; seuls les composants client passent par ici. Sans ce
 * contexte, il faudrait transmettre les textes de main en main à travers tout
 * l'arbre, et chaque nouveau composant serait une occasion d'en oublier un.
 */
export function FournisseurLangue({
  langue,
  d,
  children,
}: Valeur & { children: React.ReactNode }) {
  return <Contexte.Provider value={{ langue, d }}>{children}</Contexte.Provider>
}

export function useLangue(): Valeur {
  const valeur = useContext(Contexte)
  if (!valeur) {
    throw new Error(
      "useLangue() hors de <FournisseurLangue> — le composant n'est pas sous app/[langue]/layout.tsx.",
    )
  }
  return valeur
}
