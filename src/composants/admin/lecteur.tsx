"use client"

import { useEffect, useState } from "react"

import { useLangue } from "@/langues/contexte"

type Ouverture = { url: string; type: "pdf" | "image"; expireDans: number }

/**
 * Lecteur de pièces justificatives.
 *
 * Vérifier un dossier, c'est regarder une carte d'identité et un casier
 * judiciaire. Obliger à télécharger pour cela laisserait des copies de pièces
 * d'identité dans le dossier « Téléchargements » de quiconque vérifie — sur
 * un ordinateur partagé, dans un cybercafé, c'est exactement ce qu'il ne faut
 * pas. On regarde ici, on ne télécharge que si on en a besoin.
 *
 * L'URL n'est demandée qu'au clic, jamais au rendu de la page : ouvrir un
 * dossier ne doit pas signer six liens vers des pièces qu'on ne regardera
 * pas, ni en journaliser six consultations qui n'ont pas eu lieu.
 */
export function LecteurPiece({
  pieceId,
  libelle,
  disponible,
}: {
  pieceId: string
  libelle: string
  /** Aucun fichier déposé : le bouton le dit au lieu d'ouvrir dans le vide. */
  disponible: boolean
}) {
  const { d } = useLangue()
  const t = d.adminPages.dossier
  const [ouverture, poserOuverture] = useState<Ouverture | null>(null)
  const [enCours, poserEnCours] = useState(false)
  const [erreur, poserErreur] = useState<string | null>(null)

  async function ouvrir() {
    poserEnCours(true)
    poserErreur(null)
    try {
      const reponse = await fetch(`/api/pieces/${pieceId}`)
      if (!reponse.ok) throw new Error(String(reponse.status))
      poserOuverture((await reponse.json()) as Ouverture)
    } catch {
      poserErreur(t.pieceIllisible)
    } finally {
      poserEnCours(false)
    }
  }

  if (!disponible) {
    return <span className="doux text-[12px]">{t.pieceAbsente}</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void ouvrir()
        }}
        disabled={enCours}
        className="bt3"
      >
        {enCours ? t.chargementPiece : t.consulter}
      </button>

      {erreur ? (
        <span className="text-[12px]" style={{ color: "var(--erreur-texte)" }}>
          {erreur}
        </span>
      ) : null}

      {ouverture ? (
        <VueLecteur
          ouverture={ouverture}
          libelle={libelle}
          fermer={() => poserOuverture(null)}
        />
      ) : null}
    </>
  )
}

function VueLecteur({
  ouverture,
  libelle,
  fermer,
}: {
  ouverture: Ouverture
  libelle: string
  fermer: () => void
}) {
  const { d } = useLangue()
  const t = d.adminPages.dossier

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
    const nom = `${libelle.replace(/\s+/g, "-").toLowerCase()}.${
      ouverture.type === "pdf" ? "pdf" : "jpg"
    }`
    try {
      const reponse = await fetch(ouverture.url)
      const blob = await reponse.blob()
      const lien = document.createElement("a")
      lien.href = URL.createObjectURL(blob)
      lien.download = nom
      lien.click()
      URL.revokeObjectURL(lien.href)
    } catch {
      window.open(ouverture.url, "_blank", "noopener")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 p-4"
      style={{ background: "rgb(10 16 28 / 0.86)" }}
      role="dialog"
      aria-modal="true"
      aria-label={libelle}
      onClick={fermer}
    >
      <div
        className="flex w-full max-w-4xl flex-1 items-center justify-center overflow-hidden rounded-[10px]"
        style={{ background: "var(--surface)", maxHeight: "78vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {ouverture.type === "pdf" ? (
          // Le visualiseur du navigateur : il sait déjà tourner les pages et
          // zoomer, et le fichier reste sur une URL signée qui périme.
          <iframe
            src={ouverture.url}
            title={libelle}
            className="h-full w-full"
            style={{ minHeight: "70vh", border: "none" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ouverture.url}
            alt={libelle}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            void telecharger()
          }}
          className="bt1"
        >
          {t.telecharger}
        </button>
        <button type="button" onClick={fermer} className="bt3">
          {t.fermerLecteur}
        </button>
      </div>

      <p
        className="max-w-md text-center text-[11.5px] leading-snug"
        style={{ color: "#c3cde0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {t.lienTemporaire}
      </p>
    </div>
  )
}
