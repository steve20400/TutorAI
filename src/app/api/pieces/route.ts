import { NextResponse, type NextRequest } from "next/server"

import { api, ErreurApi } from "@/lib/api"

/**
 * Le relais qui déclare une pièce déposée.
 *
 * Le fichier, lui, est parti directement du navigateur vers le seau privé :
 * il ne passe jamais par ici. Cette route ne transmet qu'un chemin et un type,
 * avec le jeton de la session — c'est le service, puis la base, qui vérifient
 * que ce chemin appartient bien à celui qui le déclare.
 */
export async function POST(requete: NextRequest) {
  const corps = (await requete.json()) as { type_cle?: string; chemin?: string }

  if (!corps.type_cle || !corps.chemin) {
    return NextResponse.json({ erreur: "requete_incomplete" }, { status: 400 })
  }

  try {
    await api("/v1/repetiteur/pieces", {
      methode: "POST",
      corps: { type_cle: corps.type_cle, chemin: corps.chemin },
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
