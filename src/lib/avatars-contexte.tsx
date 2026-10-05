"use client"

import { createContext, useContext } from "react"

import { AVATARS, type Avatar } from "./avatars"

/**
 * Les avatars chargés depuis la base, à portée de tous les écrans.
 *
 * Sans cela, `avatarDe()` cherchait la clé dans la liste de repli écrite dans
 * le code — douze dessins sur les cinquante que la base contient. Un enfant
 * qui choisissait le vingt-septième voyait ses initiales revenir : sur
 * l'écran de choix, dans l'en-tête, partout, et rien ne disait pourquoi.
 *
 * Le repli reste : si le service ne répond pas, douze dessins valent mieux
 * qu'un écran vide. Mais c'est la base qui fait foi quand elle répond, et
 * ajouter un avatar ne demande toujours aucun déploiement.
 */
const Contexte = createContext<readonly Avatar[]>(AVATARS)

export function FournisseurAvatars({
  avatars,
  children,
}: {
  avatars: readonly Avatar[]
  children: React.ReactNode
}) {
  return (
    <Contexte.Provider value={avatars.length > 0 ? avatars : AVATARS}>
      {children}
    </Contexte.Provider>
  )
}

/** `avatar:27` → le dessin, en consultant d'abord ce que la base a rendu. */
export function useAvatar(valeur: string | null | undefined): Avatar | null {
  const liste = useContext(Contexte)
  if (!valeur?.startsWith("avatar:")) return null
  const cle = valeur.slice("avatar:".length)
  return (
    liste.find((a) => a.cle === cle) ??
    AVATARS.find((a) => a.cle === cle) ??
    null
  )
}
