import { NextResponse } from "next/server"

import { api, ErreurApi } from "@/lib/api"

/**
 * Relais vers le service, pour le lecteur de pièces.
 *
 * Le lecteur tourne dans le navigateur et ne peut donc pas appeler Render
 * directement : il n'a pas le jeton de session sous la main, et l'adresse du
 * service n'est pas publique. Ce relais s'exécute sur le serveur Vercel, où
 * les deux sont disponibles.
 *
 * Seule l'URL signée traverse — jamais le fichier. Le navigateur la charge
 * ensuite en direct depuis Supabase, ce qui évite de faire transiter une
 * carte d'identité par deux serveurs de plus.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const ouverture = await api<{
      url: string
      type: "pdf" | "image"
      expireDans: number
    }>(`/v1/admin/pieces/${id}/ouvrir`)

    return NextResponse.json(ouverture)
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
