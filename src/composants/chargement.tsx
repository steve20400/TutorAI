"use client"

import { useEffect, useState } from "react"
import { useLangue } from "@/langues/contexte"
import { Marque } from "./marque"

/**
 * Durée minimale d'affichage. Sans elle, sur une bonne connexion, l'écran
 * clignote un dixième de seconde puis disparaît — ça ressemble à un bug, et
 * la mise en place de la séance n'a pas le temps de se raconter.
 */
const DUREE_MINIMALE = 1700

/**
 * Au-delà, on prévient. Un parent qui attend sans explication ne conclut pas
 * que sa connexion est lente : il conclut que l'application est cassée.
 */
const SEUIL_LENTEUR = 5000

/** Durée de la sortie — doit rester en phase avec .chargement-sortie. */
const DUREE_SORTIE = 560

export function EcranChargement() {
  const { d } = useLangue()
  const [sortie, setSortie] = useState(false)
  const [termine, setTermine] = useState(false)
  const [lent, setLent] = useState(false)

  useEffect(() => {
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
