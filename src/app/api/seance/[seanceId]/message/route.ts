import { NextResponse } from "next/server"

import { apiFlux } from "@/lib/api"

export const runtime = "nodejs"

/**
 * POST /api/seance/:seanceId/message
 *
 * L'élève écrit au tuteur ; le tuteur répond.
 *
 * Cette route faisait tout elle-même jusqu'au 24 septembre 2026 : elle lisait
 * la base directement, construisait le contexte et appelait Anthropic avec une
 * clé posée dans l'environnement de Vercel. Trois choses que Steve avait
 * demandé d'arrêter — « le front-end ne va pas normalement communiquer avec la
 * base de données, c'est une grande faille de sécurité ».
 *
 * Elle ne fait plus que retransmettre. Le service porte le contexte, la clé et
 * les garde-fous de coût ; la RLS s'applique au jeton de l'élève comme
 * partout ailleurs.
 *
 * Le service répond en flux. On le rassemble ici pour rendre un seul objet,
 * parce que l'écran d'aujourd'hui attend ça. Le jour où on voudra voir le
 * tuteur écrire sous les yeux de l'élève, il n'y aura que l'écran à changer :
 * le protocole est déjà le bon de bout en bout.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ seanceId: string }> },
) {
  const { seanceId } = await params

  const corps = (await requete.json().catch(() => ({}))) as {
    contenu?: string
    /** Texte extrait d'une photo du manuel. Traversé, jamais écrit. */
    pageDuJour?: string
  }

  const contenu = corps.contenu?.trim()
  if (!contenu) {
    return NextResponse.json({ erreur: "message vide" }, { status: 400 })
  }

  let flux: Response
  try {
    flux = await apiFlux(`/v1/conversations/${seanceId}/message`, {
      contenu,
      ...(corps.pageDuJour ? { pageDuJour: corps.pageDuJour } : {}),
    })
  } catch {
    return NextResponse.json(
      { erreur: "le tuteur est momentanément indisponible" },
      { status: 502 },
    )
  }

  // Le service refuse avant d'ouvrir le flux : module éteint, rythme dépassé,
  // séance terminée. On retransmet son message, qui est écrit pour l'élève.
  if (!flux.ok || !flux.body) {
    const detail = (await flux.json().catch(() => ({}))) as {
      erreur?: string
      message?: string
    }
    return NextResponse.json(
      { erreur: detail.message ?? detail.erreur ?? "refus du service" },
      { status: flux.status },
    )
  }

  let reponse = ""
  let erreur: string | null = null

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
          message?: string
        }
        if (m.type === "texte" && m.texte) reponse += m.texte
        else if (m.type === "erreur") erreur = m.message ?? "appel refusé"
      } catch {
        // Une trame illisible ne doit pas emporter toute la réponse.
      }
    }
  }

  // Une erreur arrivée en cours de flux : le service a déjà gardé ce qui avait
  // été écrit, donc on rend ce qu'on a plutôt que rien.
  if (erreur && !reponse) {
    return NextResponse.json({ erreur }, { status: 502 })
  }

  return NextResponse.json({ reponse })
}
