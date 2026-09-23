"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { useLangue } from "@/langues/contexte"
import { reprendreLesEnvois } from "@/lib/envois"

type Etat = "en_cours" | "fini" | "differe" | "echoue"

/** Ce qu'un travail peut annoncer en se terminant sans lever. */
type Issue = "differe" | undefined

type Envoi = {
  id: number
  libelle: string
  etat: Etat
}

type Televersement = {
  /**
   * Lance un envoi qui survivra au changement de page.
   *
   * Le travail renvoie « differe » quand le fichier n'est pas parti mais qu'il
   * est en sécurité dans la file : ce n'est ni une réussite, ni une perte, et
   * le dire franchement évite d'annoncer une photo enregistrée qui ne l'est
   * pas encore.
   */
  lancer: (libelle: string, travail: () => Promise<Issue>) => void
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
 * Fermer l'onglet ou recharger la page interrompt la requête en cours, mais
 * ne perd plus le fichier : il a été rangé dans IndexedDB avant de partir, et
 * le Service Worker le reprend. L'indicateur reste visible tant que l'envoi
 * dure, et dit lequel des trois cas s'est produit.
 */
export function FournisseurTeleversement({
  children,
}: {
  children: ReactNode
}) {
  const [envois, poserEnvois] = useState<Envoi[]>([])

  /**
   * Le Service Worker, et la reprise de ce qui traîne.
   *
   * Il ne met aucune page en cache : il ne sert qu'à reprendre un envoi
   * interrompu. Un cache mal réglé servirait une version périmée pendant des
   * jours — le jour où une correction de sécurité part en production, une
   * partie des gens continuerait de tourner sur l'ancienne.
   */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    void navigator.serviceWorker
      .register("/sw.js")
      .then(() => reprendreLesEnvois())
      .catch(() => {
        // Navigation privée, ou Service Worker refusé : les envois partent
        // alors directement, sans reprise possible. Rien à signaler ici.
      })

    // Le Service Worker prévient quand un envoi différé a fini : sans cela,
    // l'écran continuerait d'afficher l'ancienne photo jusqu'au prochain
    // rechargement.
    const surMessage = (e: MessageEvent) => {
      if (e.data?.type === "envoi-termine") {
        poserEnvois((liste) => liste.filter((x) => String(x.id) !== e.data.id))
      }
    }
    navigator.serviceWorker.addEventListener("message", surMessage)
    return () =>
      navigator.serviceWorker.removeEventListener("message", surMessage)
  }, [])

  const lancer = useCallback(
    (libelle: string, travail: () => Promise<Issue>) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      poserEnvois((liste) => [...liste, { id, libelle, etat: "en_cours" }])

      void travail()
        .then((issue) => {
          const etat: Etat = issue === "differe" ? "differe" : "fini"
          poserEnvois((liste) =>
            liste.map((e) => (e.id === id ? { ...e, etat } : e)),
          )
          // On efface la ligne après un instant : un « terminé » qui reste à
          // l'écran finit par ressembler à quelque chose qui n'est pas fini.
          // Un report tient plus longtemps — il demande de comprendre quelque
          // chose, pas seulement de constater.
          setTimeout(
            () => poserEnvois((liste) => liste.filter((e) => e.id !== id)),
            etat === "differe" ? 8000 : 2500,
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
                : e.etat === "differe"
                  ? `${e.libelle} — ${d.commun.photoDifferee}`
                  : `${e.libelle} — ${d.commun.photoEchec}`}
          </span>
        </div>
      ))}
    </div>
  )
}
