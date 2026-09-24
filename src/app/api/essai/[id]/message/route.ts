import { NextResponse } from "next/server"

import { apiFlux } from "@/lib/api"

export const runtime = "nodejs"

/**
 * Un message de l'essai sans compte.
 *
 * L'historique vient du navigateur et y reste : rien n'est écrit en base,
 * c'est la promesse faite sur l'écran. Le service répond en flux, qu'on
 * rassemble ici — l'écran d'essai attend un seul objet, comme celui des
 * séances.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const corps = (await requete.json().catch(() => ({}))) as {
    contenu?: string
    historique?: { role: string; contenu: string }[]
  }

  const contenu = corps.contenu?.trim()
  if (!contenu) {
    return NextResponse.json({ code: "autre" }, { status: 400 })
  }

  let flux: Response
  try {
    flux = await apiFlux(`/v1/essai/${id}/message`, {
      contenu,
      historique: corps.historique ?? [],
    })
  } catch {
    return NextResponse.json({ code: "autre" }, { status: 502 })
  }

  if (!flux.ok || !flux.body) {
    const detail = (await flux.json().catch(() => ({}))) as { erreur?: string }
    return NextResponse.json(
      { code: detail.erreur === "essai_termine" ? "termine" : "autre" },
      { status: flux.status },
    )
  }

  let reponse = ""
  let jetonsRestants: number | null = null
  let code: string | null = null

  const lecteur = flux.body.getReader()
  const decodeur = new TextDecoder()
  let tampon = ""

  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    tampon += decodeur.decode(value, { stream: true })

    let coupe: number
    while ((coupe = tampon.indexOf("\n")) >= 0) {
      const ligne = tampon.slice(0, coupe).trim()
      tampon = tampon.slice(coupe + 1)
      if (!ligne.startsWith("data:")) continue

      try {
        const m = JSON.parse(ligne.slice(5).trim()) as {
          type: string
          texte?: string
          code?: string
          jetonsRestants?: number
        }
        if (m.type === "texte" && m.texte) reponse += m.texte
        else if (m.type === "fin") jetonsRestants = m.jetonsRestants ?? null
        else if (m.type === "erreur") code = m.code ?? "autre"
      } catch {
        // Une trame illisible n'emporte pas toute la réponse.
      }
    }
  }

  if (code && !reponse) return NextResponse.json({ code }, { status: 502 })
  return NextResponse.json({ reponse, jetonsRestants })
}
