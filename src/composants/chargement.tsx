"use client"

import { useEffect, useState } from "react"
import { useLangue } from "@/langues/contexte"
import { Marque } from "./marque"

/**
 * Durée minimale d'affichage. Sans elle, sur une bonne connexion, l'écran
 * clignote un dixième de seconde puis disparaît — ça ressemble à un bug, et
 * la mise en place de la séance n'a pas le temps de se raconter.
 */
const DUREE_MINIMALE = 3200

/**
 * Au-delà, on prévient. Un parent qui attend sans explication ne conclut pas
 * que sa connexion est lente : il conclut que l'application est cassée.
 */
const SEUIL_LENTEUR = 5000

/** Durée de la sortie — doit rester en phase avec .chargement-sortie. */
const DUREE_SORTIE = 560

/**
 * L'écran ne se joue qu'une fois par onglet.
 *
 * Il vit dans le layout de `[langue]`, donc changer de langue démonte ce
 * layout et le remonte : sans ce garde-fou, passer de FR à EN rejouait toute
 * l'ouverture et renvoyait le visiteur au début, alors qu'il voulait
 * simplement relire la page où il était.
 *
 * `sessionStorage` et non `localStorage` : l'animation doit revenir à la
 * prochaine ouverture de l'application, pas disparaître pour toujours.
 */
const CLE_DEJA_JOUE = "tutela-chargement-joue"

function dejaJoue(): boolean {
  try {
    return sessionStorage.getItem(CLE_DEJA_JOUE) === "1"
  } catch {
    // Navigation privée ou stockage bloqué : on rejoue l'écran. Le revoir est
    // moins grave que de planter.
    return false
  }
}

export function EcranChargement() {
  const { d } = useLangue()
  const [sortie, setSortie] = useState(false)
  const [termine, setTermine] = useState(false)
  const [lent, setLent] = useState(false)

  useEffect(() => {
    // Déjà joué dans cet onglet (changement de langue, navigation interne) :
    // on s'efface immédiatement, sans animation de sortie.
    if (dejaJoue()) {
      setTermine(true)
      return
    }

    const minuteries: ReturnType<typeof setTimeout>[] = []
    let annule = false

    const pageChargee = new Promise<void>((resolve) => {
      if (document.readyState === "complete") return resolve()
      window.addEventListener("load", () => resolve(), { once: true })
    })

    const dureeMinimale = new Promise<void>((resolve) => {
      minuteries.push(setTimeout(resolve, DUREE_MINIMALE))
    })

    const avertissement = setTimeout(() => {
      if (!annule) setLent(true)
    }, SEUIL_LENTEUR)
    minuteries.push(avertissement)

    void Promise.all([pageChargee, dureeMinimale]).then(() => {
      if (annule) return
      clearTimeout(avertissement)
      try {
        sessionStorage.setItem(CLE_DEJA_JOUE, "1")
      } catch {
        // idem
      }
      setSortie(true)
      minuteries.push(setTimeout(() => setTermine(true), DUREE_SORTIE))
    })

    // L'écran couvre la page : laisser le contenu défiler dessous donnerait
    // une impression de flottement au relâchement.
    const debordementInitial = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      annule = true
      minuteries.forEach(clearTimeout)
      document.body.style.overflow = debordementInitial
    }
  }, [])

  useEffect(() => {
    if (termine) document.body.style.overflow = ""
  }, [termine])

  if (termine) return null

  return (
    <div
      className={`chargement ${sortie ? "chargement-sortie" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={d.chargement.aria}
    >
      <div className="motif-fond" />

      <div className="chargement-bloc">
        <Marque taille={92} anime />

        <span
          className="chargement-anime font-bold"
          style={{
            letterSpacing: "0.17em",
            fontSize: 21,
            marginTop: 18,
            animation: "chargement-apparait .45s ease-out .95s both",
          }}
        >
          TUTELA
        </span>

        <div
          className="chargement-barre chargement-anime"
          style={{ animation: "chargement-apparait .4s ease-out 1.15s both" }}
        >
          <i />
        </div>
      </div>

      <p
        className="chargement-slogan chargement-anime"
        style={{ animation: "chargement-apparait .5s ease-out 1.3s both" }}
      >
        {d.chargement.sloganLigne1}
        <br />
        {d.chargement.sloganLigne2}
      </p>

      {lent ? (
        <p className="chargement-lenteur">{d.chargement.lent}</p>
      ) : null}
    </div>
  )
}
