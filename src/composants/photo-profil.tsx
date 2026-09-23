"use client"

import { useEffect, useRef, useState } from "react"

import { Avatar } from "@/composants/avatar"
import { poserPhotoDeProfil } from "@/actions/compte"
import { useLangue } from "@/langues/contexte"
import { useTeleversement } from "@/composants/televersement"
import { mettreEnFile } from "@/lib/envois"
import { supabaseNavigateur } from "@/lib/supabase/client"

/** Côté du carré final. 256 suffit : l'avatar le plus grand fait 72 pixels,
 *  et le double couvre les écrans à forte densité. */
const COTE = 256

/** Au-delà, on renonce plutôt que de faire attendre dix minutes. */
const POIDS_MAX = 2 * 1024 * 1024

const TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Téléverser sa photo depuis son appareil.
 *
 * L'image est RÉDUITE dans le navigateur avant l'envoi. Une photo de téléphone
 * pèse trois à cinq mégaoctets ; sur une connexion camerounaise, c'est
 * plusieurs minutes d'attente pour une image qu'on affichera en soixante-
 * quatre pixels. Réduite, elle pèse quelques dizaines de kilo-octets et part
 * en une seconde.
 *
 * Le fichier va directement du navigateur à Supabase, sans passer par Render :
 * faire transiter une image par un service qui peut dormir cinquante secondes
 * n'apporterait rien, et les politiques du bucket s'appliquent de toute façon.
 *
 * Un élève n'a pas ce composant : il choisit un avatar. La règle est aussi
 * tenue en base, sur le profil et sur le fichier.
 */
export function PhotoProfil({
  nom,
  photoUrl,
  compteId,
  /** Appelé avec la nouvelle adresse, ou null si la photo est retirée. */
  surChangement,
}: {
  nom: string
  photoUrl: string | null
  compteId: string
  surChangement: (url: string | null) => void
}) {
  const { d } = useLangue()
  const t = d.commun
  const { lancer } = useTeleversement()
  const champ = useRef<HTMLInputElement>(null)
  const [enCours, poserEnCours] = useState(false)
  const [erreur, poserErreur] = useState<string | null>(null)

  /**
   * L'aperçu, pris sur le fichier lui-même.
   *
   * Montrer tout de suite l'adresse distante ne marche pas : le fichier n'y
   * est pas encore, l'image échoue, et l'avatar retombe sur les initiales sans
   * plus jamais réessayer — il fallait recharger la page pour voir sa propre
   * photo. Le fichier, lui, est déjà là, dans la mémoire du navigateur.
   */
  const [apercuLocal, poserApercuLocal] = useState<string | null>(null)

  // Une adresse locale occupe de la mémoire tant qu'on ne la relâche pas.
  useEffect(() => {
    if (!apercuLocal) return
    return () => URL.revokeObjectURL(apercuLocal)
  }, [apercuLocal])

  /**
   * Redimensionne en carré, en rognant au centre.
   *
   * Rogner plutôt que déformer : un visage étiré est pire qu'un visage coupé,
   * et le centre d'une photo de portrait contient presque toujours le visage.
   */
  async function reduire(fichier: File): Promise<Blob> {
    const image = await createImageBitmap(fichier)
    const cote = Math.min(image.width, image.height)
    const x = (image.width - cote) / 2
    const y = (image.height - cote) / 2

    const toile = document.createElement("canvas")
    toile.width = COTE
    toile.height = COTE
    const pinceau = toile.getContext("2d")
    if (!pinceau) throw new Error("canvas")

    pinceau.drawImage(image, x, y, cote, cote, 0, 0, COTE, COTE)
    image.close()

    return new Promise((resoudre, rejeter) => {
      toile.toBlob(
        (blob) => (blob ? resoudre(blob) : rejeter(new Error("blob"))),
        "image/jpeg",
        0.82,
      )
    })
  }

  async function envoyer(fichier: File) {
    poserErreur(null)

    if (!TYPES.includes(fichier.type)) {
      poserErreur(t.photoMauvaisType)
      return
    }

    // La réduction, elle, reste ici : elle dure une fraction de seconde et a
    // besoin du fichier, qu'on ne peut pas transporter ailleurs.
    poserEnCours(true)
    let reduite: Blob
    try {
      reduite = await reduire(fichier)
    } catch {
      poserErreur(t.photoEchec)
      poserEnCours(false)
      return
    }
    poserEnCours(false)

    if (reduite.size > POIDS_MAX) {
      poserErreur(t.photoTropGrande)
      return
    }

    // Un nom nouveau à chaque envoi : remplacer le fichier en place
    // laisserait l'ancienne image dans le cache des navigateurs, et la
    // nouvelle photo mettrait des jours à apparaître chez les autres.
    const chemin = `${compteId}/${Date.now()}.jpg`
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

    // L'aperçu change tout de suite, avant même que le fichier soit parti.
    // Attendre la fin pour montrer la nouvelle photo laisserait croire que
    // rien ne s'est passé — surtout quand l'envoi peut durer une minute.
    poserApercuLocal(URL.createObjectURL(reduite))

    // L'adresse distante, elle, est celle qu'on enregistre : jamais un
    // `blob:`, qui ne veut rien dire en dehors de cet onglet et qui partirait
    // tel quel dans le champ caché du formulaire.
    const apercu = `${base}/storage/v1/object/public/photos/${chemin}`

    lancer(t.choisirPhoto, async () => {
      const supabase = supabaseNavigateur()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Le fichier entre dans la file AVANT de partir. S'il n'arrive pas —
      // connexion coupée, onglet fermé, page rechargée — le Service Worker le
      // reprend dès que le réseau revient, sans qu'on ait à le rechoisir.
      const { reprisePossible } = await mettreEnFile({
        id: chemin,
        supabaseUrl: base,
        clePubliable: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        jeton: session?.access_token ?? "",
        chemin,
        blob: reduite,
        rattacherA: "/api/photo",
      })

      // On tente l'envoi immédiatement : si la connexion tient, la photo est
      // là en une seconde et le Service Worker n'aura rien à reprendre.
      const { error } = await supabase.storage
        .from("photos")
        .upload(chemin, reduite, { contentType: "image/jpeg", upsert: false })

      if (error) {
        // L'envoi reste dans la file. Reste à savoir si quelqu'un la reprendra :
        // sans Service Worker — navigation privée, navigateur qui le refuse —
        // personne ne le fera, et annoncer un report serait mentir.
        if (!reprisePossible) throw error
        return "differe" as const
      }

      await poserPhotoDeProfil(apercu)
    })

    surChangement(apercu)
  }

  return (
    // La rangée se replie : sur un écran de 320 points, l'avatar et les deux
    // boutons ne tiennent pas côte à côte, et les serrer colle le bouton
    // contre le bord de la carte. Repliés, les boutons prennent toute la
    // largeur et se rangent l'un à côté de l'autre.
    <div className="flex flex-wrap items-center gap-4">
      <Avatar nom={nom} photoUrl={apercuLocal ?? photoUrl} taille={72} />

      <div className="flex min-w-0 flex-1 basis-[210px] flex-col gap-2">
        <input
          ref={champ}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void envoyer(f)
            e.target.value = ""
          }}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => champ.current?.click()}
            disabled={enCours}
            className="bt2"
          >
            {enCours
              ? t.photoEnvoi
              : photoUrl
                ? t.changerPhoto
                : t.choisirPhoto}
          </button>

          {photoUrl ? (
            <button
              type="button"
              onClick={() => {
                poserApercuLocal(null)
                surChangement(null)
                void poserPhotoDeProfil(null)
              }}
              className="bt3"
            >
              {t.retirerPhoto}
            </button>
          ) : null}
        </div>

        {erreur ? (
          <p className="text-[12px]" style={{ color: "var(--erreur-texte)" }}>
            {erreur}
          </p>
        ) : null}
      </div>
    </div>
  )
}
