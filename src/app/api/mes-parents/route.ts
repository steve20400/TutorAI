import { NextResponse } from "next/server"

import { api } from "@/lib/api"

export const runtime = "nodejs"

/** Les adultes rattachés à l'élève, et l'état de sa jauge. Simple relais. */
export async function GET() {
  try {
    return NextResponse.json(await api("/v1/liens/mes-parents"))
  } catch {
    // Une jauge qu'on ne peut pas lire ne doit pas casser la conversation :
    // on répond « pas de jauge », l'écran n'en affiche aucune.
    return NextResponse.json({ actif: false, part: 100, donnees: [] })
  }
}
