"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

import { chemin, type Langue } from "@/langues"

/**
 * La recherche de la barre d'application.
 *
 * Trois comportements, et chacun répond à un défaut constaté.
 *
 * ENTRÉE POUR CHERCHER. Lancer une requête à chaque lettre ferait partir dix
 * appels pour « mathématiques ». On attend donc la validation — c'était déjà
 * le cas.
 *
 * MAIS LE VIDE EST IMMÉDIAT. Effacer son texte et devoir encore appuyer sur
 * Entrée pour retrouver l'annuaire entier n'a aucun sens : effacer n'est pas
 * une recherche, c'est son abandon. Dès que le champ est vide, la liste
 * complète revient, sans rien demander.
 *
 * SUR TÉLÉPHONE, LE CHAMP SE DÉPLIE. Le pictogramme menait à l'annuaire sans
 * jamais ouvrir de champ : on cliquait sur une loupe et il ne se passait
 * rien. Il ouvre maintenant un champ qui prend toute la barre, et une croix
 * le referme.
 *
 * `replace` et non `push` : vingt recherches successives ne doivent pas
 * obliger à vingt retours pour sortir de l'annuaire.
 */
export function Recherche({
  valeur,
  placeholder,
  etiquette,
  langue,
  encre,
  encreDoux,
}: {
  valeur?: string
  placeholder: string
  etiquette: string
  langue: Langue
  encre: string
  encreDoux: string
}) {
  const router = useRouter()
  const [texte, setTexte] = useState(valeur ?? "")
  const [deplie, setDeplie] = useState(false)
  const [, demarrer] = useTransition()
  const champ = useRef<HTMLInputElement | null>(null)
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

  useEffect(() => {
    if (deplie) champ.current?.focus()
  }, [deplie])

  function chercher(e: React.FormEvent) {
    e.preventDefault()
    const q = texte.trim()
    demarrer(() =>
      router.replace(
        chemin(langue, `/annuaire${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      ),
    )
    setDeplie(false)
  }

  const champStyle = {
    background: "rgb(238 241 247 / 0.1)",
    color: encreDoux,
  }

  return (
    <>
      {/* Grand écran : toujours déployé. */}
      <form
        onSubmit={chercher}
        className="relative hidden w-[290px] items-center gap-[9px] rounded-[22px] px-3.5 py-2 lg:flex"
        style={champStyle}
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
      </form>

      {/* Téléphone : le pictogramme, puis le champ qui prend la barre. */}
      {!deplie ? (
        <button
          type="button"
          onClick={() => setDeplie(true)}
          aria-label={etiquette}
          aria-expanded={false}
          className="p-2 lg:hidden"
          style={{ color: encreDoux }}
        >
          <Loupe taille={19} />
        </button>
      ) : (
        <form
          onSubmit={chercher}
          className="absolute inset-x-3 z-10 flex items-center gap-2 rounded-[22px] px-3 py-2 lg:hidden"
          style={champStyle}
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
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none"
            style={{ color: encre }}
          />
          <button
            type="button"
            onClick={() => {
              setTexte("")
              setDeplie(false)
            }}
            aria-label={etiquette}
            style={{ color: encreDoux }}
          >
            <svg
              width="18"
              height="18"
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
          </button>
        </form>
      )}
    </>
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
