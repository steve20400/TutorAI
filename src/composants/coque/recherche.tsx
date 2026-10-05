"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

import { ENCRE } from "./encre"
import { chemin, type Langue } from "@/langues"

/**
 * La recherche de la barre d'application.
 *
 * Trois comportements, et chacun répond à un défaut constaté.
 *
 * ENTRÉE POUR CHERCHER. Lancer une requête à chaque lettre ferait partir dix
 * appels pour « mathématiques ». On attend donc la validation.
 *
 * MAIS ENTRÉE N'EST PAS LA SEULE PORTE. « Ce n'est pas tout le monde qui a la
 * réflexion d'aller taper sur Entrée ; certains veulent à tout prix cliquer. »
 * Un bouton le fait donc aussi, visible, à côté du champ.
 *
 * LE VIDE EST IMMÉDIAT. Effacer son texte et devoir encore valider pour
 * retrouver l'annuaire entier n'a aucun sens : effacer n'est pas une
 * recherche, c'est son abandon. Dès que le champ est vide, la liste complète
 * revient, sans rien demander.
 *
 * `replace` et non `push` : vingt recherches successives ne doivent pas
 * obliger à vingt retours pour sortir de l'annuaire.
 */
function useRecherche(valeur: string | undefined, langue: Langue) {
  const router = useRouter()
  const [texte, setTexte] = useState(valeur ?? "")
  const [, demarrer] = useTransition()
  const premier = useRef(true)

  // Le champ suit l'adresse : revenir en arrière doit le remettre dans l'état
  // qu'il avait, sinon il affirme une recherche qui n'est plus appliquée.
  useEffect(() => {
    setTexte(valeur ?? "")
  }, [valeur])

  // Vidé : on rend l'annuaire entier tout de suite. Le premier rendu ne
  // compte pas, sans quoi ouvrir la page lancerait une navigation.
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    if (texte !== "" || (valeur ?? "") === "") return
    demarrer(() => router.replace(chemin(langue, "/annuaire")))
  }, [texte, valeur, langue, router])

  function lancer() {
    const q = texte.trim()
    demarrer(() =>
      router.replace(
        chemin(langue, `/annuaire${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      ),
    )
  }

  return { texte, setTexte, lancer }
}

/**
 * Grand écran : le champ de 290 px du canevas, toujours déplié.
 *
 * Son bouton de validation n'apparaît qu'une fois quelque chose saisi, et
 * c'est le seul endroit du produit où un bouton va et vient. La raison tient
 * en une phrase : un champ vide n'a rien à valider. Posé en permanence, il
 * occuperait la barre pour ne rien faire les neuf dixièmes du temps, et
 * inviterait à cliquer sur un bouton qui ne répondrait pas.
 *
 * Il pousse vers l'espace libre du milieu, jamais vers la ville ni vers le
 * compte : rien ne bouge sous la main au moment où l'on tape.
 */
export function RechercheBureau({
  valeur,
  placeholder,
  etiquette,
  valider,
  langue,
  encre,
  encreDoux,
}: {
  valeur?: string
  placeholder: string
  etiquette: string
  valider: string
  langue: Langue
  encre: string
  encreDoux: string
}) {
  const { texte, setTexte, lancer } = useRecherche(valeur, langue)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        lancer()
      }}
      className="relative hidden items-center gap-2 lg:flex"
    >
      <div
        className="flex w-[290px] items-center gap-[9px] rounded-[22px] px-3.5 py-2"
        style={{ background: "rgb(238 241 247 / 0.1)", color: encreDoux }}
      >
        <Loupe taille={15} />
        <label htmlFor="q" className="sr-only">
          {etiquette}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] outline-none"
          style={{ color: encre }}
        />
      </div>

      {texte.trim() ? (
        <button
          type="submit"
          className="shrink-0 rounded-[20px] px-3.5 py-[7px] text-[13px] font-medium"
          style={{ background: encre, color: ENCRE }}
        >
          {valider}
        </button>
      ) : null}
    </form>
  )
}

/**
 * Téléphone : une seconde ligne sous la barre, et non par-dessus.
 *
 * Le champ se dépliait en travers de la barre et recouvrait le nom de
 * l'application d'un côté, la photo de profil de l'autre — on cherchait en
 * ayant effacé l'en-tête. Il ouvre maintenant une ligne à lui : la barre
 * grandit, le logo et le compte restent à leur place, et le champ a toute la
 * largeur plutôt qu'un tiers.
 */
export function RechercheTelephone({
  valeur,
  placeholder,
  etiquette,
  valider,
  langue,
  encre,
  encreDoux,
  surFermer,
}: {
  valeur?: string
  placeholder: string
  etiquette: string
  /** Le libellé du bouton, pour qui ne pense pas à la touche Entrée. */
  valider: string
  langue: Langue
  encre: string
  encreDoux: string
  surFermer: () => void
}) {
  const { texte, setTexte, lancer } = useRecherche(valeur, langue)
  const champ = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    champ.current?.focus()
  }, [])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        lancer()
        surFermer()
      }}
      className="flex items-center gap-2 px-3.5 pb-3 lg:hidden"
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-2 rounded-[22px] px-3.5 py-2.5"
        style={{ background: "rgb(238 241 247 / 0.1)", color: encreDoux }}
      >
        <Loupe taille={16} />
        <label htmlFor="q-tel" className="sr-only">
          {etiquette}
        </label>
        <input
          id="q-tel"
          ref={champ}
          name="q"
          type="search"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-[14.5px] outline-none"
          style={{ color: encre }}
        />
        {texte ? (
          <button
            type="button"
            onClick={() => setTexte("")}
            aria-label={etiquette}
            className="shrink-0"
            style={{ color: encreDoux }}
          >
            <Croix taille={17} />
          </button>
        ) : null}
      </div>

      <button
        type="submit"
        className="shrink-0 rounded-[20px] px-4 py-2.5 text-[14px] font-medium"
        style={{ background: encre, color: ENCRE }}
      >
        {valider}
      </button>
    </form>
  )
}

/** Le pictogramme qui ouvre et referme la ligne de recherche. */
export function BoutonLoupe({
  ouvert,
  etiquette,
  encreDoux,
  surClic,
}: {
  ouvert: boolean
  etiquette: string
  encreDoux: string
  surClic: () => void
}) {
  return (
    <button
      type="button"
      onClick={surClic}
      aria-label={etiquette}
      aria-expanded={ouvert}
      className="shrink-0 p-2 lg:hidden"
      style={{ color: encreDoux }}
    >
      {ouvert ? <Croix taille={19} /> : <Loupe taille={19} />}
    </button>
  )
}

function Loupe({ taille }: { taille: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block shrink-0"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function Croix({ taille }: { taille: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      className="block shrink-0"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
