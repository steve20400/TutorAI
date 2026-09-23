"use client"

import { useEffect, useState } from "react"

import { avatarDe, estUnePhoto } from "@/lib/avatars"
import { useLangue } from "@/langues/contexte"

/**
 * Avatar : la photo si elle existe, les initiales sinon.
 *
 * Jamais une silhouette grise anonyme. Sur un produit où des parents confient
 * leur enfant à un adulte, une pastille sans visage et sans nom est le
 * contraire de ce qu'on veut donner à voir — les initiales, au moins, sont
 * quelqu'un.
 *
 * La couleur de fond est tirée du nom, donc stable : la même personne garde sa
 * teinte d'un écran à l'autre, et deux homonymes ne se confondent pas.
 *
 * Une vraie photo s'agrandit et se télécharge au clic ; des initiales, non.
 * Il n'y a rien à agrandir dans deux lettres, et un curseur qui promet une
 * action qui n'arrive pas est pire que pas de curseur du tout.
 */

/** Teintes sourdes, lisibles avec du texte foncé dans les deux thèmes. */
const TEINTES = [
  "#d9c9a8",
  "#c6d6c9",
  "#cfd3e2",
  "#e0cdc4",
  "#cddbe0",
  "#dbd0dd",
] as const

export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? "")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 0 && /\p{L}/u.test(m[0]!))

  if (mots.length === 0) return "?"
  if (mots.length === 1) return mots[0]!.slice(0, 2).toUpperCase()
  return (mots[0]![0]! + mots[mots.length - 1]![0]!).toUpperCase()
}

/** Somme des points de code : suffisant pour répartir, et stable partout. */
function teinteDe(nom: string): string {
  let somme = 0
  for (const c of nom) somme += c.codePointAt(0) ?? 0
  return TEINTES[somme % TEINTES.length]!
}

export function Avatar({
  nom,
  photoUrl,
  taille = 32,
  className,
}: {
  nom: string | null | undefined
  photoUrl?: string | null
  taille?: number
  className?: string
}) {
  const libelle = (nom ?? "").trim()
  const [ouverte, poserOuverte] = useState(false)

  // Un avatar choisi dans la liste : un dessin, pas une image à télécharger.
  // Il ne s'agrandit pas non plus — il n'y a rien de plus à en voir.
  const avatar = avatarDe(photoUrl)
  if (avatar) {
    return (
      <span
        aria-hidden
        title={libelle || undefined}
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full ${className ?? ""}`}
        style={{ width: taille, height: taille, background: avatar.fond }}
      >
        <svg
          viewBox="0 0 48 48"
          width={taille}
          height={taille}
          fill="none"
          stroke={avatar.trait}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={avatar.forme} />
        </svg>
      </span>
    )
  }

  if (!estUnePhoto(photoUrl)) {
    return (
      <span
        aria-hidden
        title={libelle || undefined}
        className={`grid shrink-0 place-items-center rounded-full font-semibold ${className ?? ""}`}
        style={{
          width: taille,
          height: taille,
          background: teinteDe(libelle || "?"),
          // Encre fixe et non var(--texte) : la teinte de fond est claire dans
          // les deux thèmes, du texte clair dessus serait illisible en sombre.
          color: "#22304a",
          fontSize: Math.round(taille * 0.38),
          letterSpacing: "0.02em",
        }}
      >
        {initiales(libelle)}
      </span>
    )
  }

  // `estUnePhoto` a déjà écarté null et les avatars : c'est bien une image.
  const url = photoUrl as string

  return (
    <>
      <button
        type="button"
        onClick={() => poserOuverte(true)}
        className={`shrink-0 overflow-hidden rounded-full transition hover:opacity-85 ${className ?? ""}`}
        style={{ width: taille, height: taille }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={libelle}
          width={taille}
          height={taille}
          className="h-full w-full object-cover"
        />
      </button>

      {ouverte ? (
        <VuePhoto
          url={url}
          nom={libelle}
          fermer={() => poserOuverte(false)}
        />
      ) : null}
    </>
  )
}

/**
 * La photo en grand, par-dessus la page.
 *
 * Le téléchargement passe par un blob et non par un simple `download` : la
 * photo vient du stockage Supabase, donc d'une autre origine, et l'attribut
 * `download` y est ignoré par les navigateurs — le fichier s'ouvrirait dans un
 * onglet au lieu d'être enregistré. Si la copie échoue, on retombe sur
 * l'ouverture directe : mieux vaut un onglet qu'un bouton mort.
 */
function VuePhoto({
  url,
  nom,
  fermer,
}: {
  url: string
  nom: string
  fermer: () => void
}) {
  const { d } = useLangue()

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer()
    }
    window.addEventListener("keydown", surTouche)
    const debordement = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", surTouche)
      document.body.style.overflow = debordement
    }
  }, [fermer])

  async function telecharger() {
    const nomFichier = `${nom.replace(/\s+/g, "-").toLowerCase() || "photo"}.jpg`
    try {
      const reponse = await fetch(url)
      const blob = await reponse.blob()
      const lien = document.createElement("a")
      lien.href = URL.createObjectURL(blob)
      lien.download = nomFichier
      lien.click()
      URL.revokeObjectURL(lien.href)
    } catch {
      window.open(url, "_blank", "noopener")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-5"
      style={{ background: "rgb(10 16 28 / 0.82)" }}
      role="dialog"
      aria-modal="true"
      aria-label={nom}
      onClick={fermer}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={nom}
        className="max-h-[72vh] max-w-full rounded-[10px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="flex flex-wrap items-center justify-center gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={telecharger} className="bt1">
          {d.commun.telechargerLaPhoto}
        </button>
        <button type="button" onClick={fermer} className="bt3">
          {d.commun.fermerLaPhoto}
        </button>
      </div>
    </div>
  )
}
