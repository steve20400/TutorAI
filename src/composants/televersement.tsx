"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

import { useLangue } from "@/langues/contexte"

type Envoi = {
  id: number
  libelle: string
  etat: "en_cours" | "fini" | "echoue"
}

type Televersement = {
  /** Lance un envoi qui survivra au changement de page. */
  lancer: (libelle: string, travail: () => Promise<void>) => void
  envois: Envoi[]
}

const Contexte = createContext<Televersement | null>(null)

/**
 * Les envois de fichiers, au-dessus des pages.
 *
 * Un envoi lancé depuis un écran s'arrête si cet écran disparaît : React
 * démonte le composant, et la promesse en cours n'a plus personne pour
 * recevoir son résultat. Sur une connexion lente, cela veut dire qu'on doit
 * regarder une barre de progression sans rien faire d'autre — pour une photo
 * de profil, c'est absurde.
 *
 * Le fournisseur vit dans le layout racine, que la navigation ne démonte pas.
 * L'envoi continue donc pendant qu'on va ailleurs, et un indicateur discret
 * dit qu'il tourne encore.
 *
 * Ce qui ne survit PAS : fermer l'onglet ou recharger la page. Le navigateur
 * interrompt alors la requête, et il n'existe pas de moyen simple de la
 * reprendre — un Service Worker le pourrait, au prix d'une complexité que
 * cette fonction ne justifie pas. L'indicateur reste donc visible tant que
 * l'envoi dure : quelqu'un qui le voit sait qu'il vaut mieux attendre.
 */
export function FournisseurTeleversement({
  children,
}: {
  children: ReactNode
}) {
  const [envois, poserEnvois] = useState<Envoi[]>([])

  const lancer = useCallback(
    (libelle: string, travail: () => Promise<void>) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      poserEnvois((liste) => [...liste, { id, libelle, etat: "en_cours" }])

      void travail()
        .then(() => {
          poserEnvois((liste) =>
            liste.map((e) => (e.id === id ? { ...e, etat: "fini" } : e)),
          )
          // On efface la ligne après un instant : un « terminé » qui reste à
          // l'écran finit par ressembler à quelque chose qui n'est pas fini.
          setTimeout(
            () => poserEnvois((liste) => liste.filter((e) => e.id !== id)),
            2500,
          )
        })
        .catch(() => {
          poserEnvois((liste) =>
            liste.map((e) => (e.id === id ? { ...e, etat: "echoue" } : e)),
          )
          // Un échec reste plus longtemps : c'est la seule occasion de le voir
          // si on a changé de page entre-temps.
          setTimeout(
            () => poserEnvois((liste) => liste.filter((e) => e.id !== id)),
            8000,
          )
        })
    },
    [],
  )

  return (
    <Contexte.Provider value={{ lancer, envois }}>
      {children}
      <Indicateur envois={envois} />
    </Contexte.Provider>
  )
}

export function useTeleversement(): Televersement {
  const contexte = useContext(Contexte)
  if (!contexte) {
    throw new Error(
      "useTeleversement() hors de FournisseurTeleversement — l'envoi ne survivrait pas au changement de page.",
    )
  }
  return contexte
}

/** Discret, en bas : il informe sans réclamer d'attention. */
function Indicateur({ envois }: { envois: Envoi[] }) {
  const { d } = useLangue()
  if (envois.length === 0) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {envois.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-2.5 rounded-full px-4 py-2 text-[12.5px] shadow-lg"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--bordure)",
            color:
              e.etat === "echoue" ? "var(--erreur-texte)" : "var(--texte)",
          }}
        >
          {e.etat === "en_cours" ? <span className="rouet" aria-hidden /> : null}
          <span>
            {e.etat === "en_cours"
              ? `${e.libelle} — ${d.commun.photoEnvoi}`
              : e.etat === "fini"
                ? `${e.libelle} — ${d.commun.photoEnvoyee}`
                : `${e.libelle} — ${d.commun.photoEchec}`}
          </span>
        </div>
      ))}
    </div>
  )
}
