import { NextResponse } from "next/server"

import { api, ErreurApi } from "@/lib/api"

/**
 * Rattache une photo déjà déposée au profil de l'appelant.
 *
 * Appelée par le Service Worker, qui n'a ni jeton de session sous la main ni
 * accès aux actions serveur : il ne dispose que des cookies du navigateur,
 * qui suffisent ici puisque cette route s'exécute côté serveur.
 *
 * Elle n'accepte que l'adresse, jamais le fichier : celui-ci est déjà parti
 * directement vers Supabase, sans transiter par Vercel ni par Render.
 */
export async function POST(requete: Request) {
  const { url } = (await requete.json().catch(() => ({}))) as {
    url?: string
  }

  // Une adresse qui ne pointe pas vers le coffre des photos n'a rien à faire
  // dans un profil : sans cette vérification, on pourrait y inscrire n'importe
  // quelle adresse du web, et l'application chargerait une image d'ailleurs à
  // chaque affichage.
  const attendu = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`
  if (url && !url.startsWith(attendu)) {
    return NextResponse.json(
      { erreur: "adresse_refusee", message: "Cette adresse n'est pas une photo de la plateforme." },
      { status: 400 },
    )
  }

  try {
    await api("/v1/compte", {
      methode: "POST",
      corps: { photo_url: url ?? "" },
    })
    return NextResponse.json({ ok: true })
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return NextResponse.json(
        { erreur: erreur.code, message: erreur.message },
        { status: erreur.statut },
      )
    }
    return NextResponse.json({ erreur: "service" }, { status: 502 })
  }
}
