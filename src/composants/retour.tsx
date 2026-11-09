"use client"

import { useRouter } from "next/navigation"

import { useLangue } from "@/langues/contexte"

/**
 * Revenir d'où l'on vient. Sur chaque écran, sans exception.
 *
 * Le bouton du navigateur ou du téléphone n'est pas fiable ici : arrivé par
 * un lien direct, par une notification ou après un rechargement, il fait
 * sortir de l'application au lieu de remonter d'un cran. Sur un téléphone
 * Android, il peut même fermer l'onglet.
 *
 * Donc les deux, dans cet ordre : l'histoire du navigateur si on a vraiment
 * navigué dans l'application, et sinon `vers` — la page qui contient
 * logiquement celle-ci. On ne laisse jamais quelqu'un dans une impasse, et
 * c'est pour ça que `vers` est obligatoire : une page sans parent déclaré
 * est une page où quelqu'un finira coincé.
 *
 * Ce composant vivait dans `composants/admin/`, et l'administration était
 * donc la seule partie de l'application à en avoir un partout. Ailleurs,
 * chaque écran rebricolait le sien — ou l'oubliait.
 */
export function Retour({
  vers,
  etiquette,
  surBandeau = false,
  couleur,
}: {
  vers: string
  /** Pour nommer la destination : « Dossiers » plutôt que « Retour ». */
  etiquette?: string
  /**
   * Posé sur un bandeau sombre — l'espace du répétiteur, la fiche d'un
   * répétiteur.
   *
   * La couleur du texte y serait illisible, et une photo dessous rend le
   * contraste imprévisible : la pastille translucide garantit que la flèche
   * se voit quelle que soit l'image. C'est déjà ce que fait la fiche
   * d'annuaire sur son propre bandeau.
   */
  surBandeau?: boolean
  /**
   * Pour les écrans qui ont leur propre palette — la salle de cours.
   *
   * `.doux` pointe vers `--texte-doux`, un jeton de l'application : sur le
   * plan sombre de la salle, il donnerait un gris qui ne s'y lit pas. Le
   * seul endroit qui connaît la bonne couleur est l'écran lui-même.
   */
  couleur?: string
}) {
  const router = useRouter()
  const { d } = useLangue()

  return (
    <button
      type="button"
      onClick={() => {
        // `history.length` vaut 1 sur un onglet ouvert directement sur cette
        // page : il n'y a alors rien derrière, et revenir en arrière sortirait
        // du site.
        if (window.history.length > 1) router.back()
        else router.push(vers)
      }}
      aria-label={etiquette ?? d.commun.retour}
      className={
        surBandeau
          ? "inline-flex items-center gap-1 rounded-full p-[7px] text-[12px] transition hover:opacity-80"
          : `-ml-1 inline-flex items-center gap-1 rounded-[8px] px-1 py-0.5 text-[12px] transition hover:opacity-100${couleur ? "" : " doux"}`
      }
      style={
        surBandeau
          ? { background: "rgb(20 32 58 / 0.55)", color: "#f4f1ea" }
          : couleur
            ? { color: couleur }
            : undefined
      }
    >
      <svg
        width={surBandeau ? 20 : 14}
        height={surBandeau ? 20 : 14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {surBandeau ? null : (etiquette ?? d.commun.retour)}
    </button>
  )
}
