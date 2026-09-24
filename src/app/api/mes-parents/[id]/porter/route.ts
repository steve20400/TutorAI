import { NextResponse } from "next/server"

import { api, ErreurApi } from "@/lib/api"

export const runtime = "nodejs"

/** L'élève choisit quel adulte porte ses séances. */
export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await api(`/v1/liens/${id}/porter`, { methode: "POST" })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { erreur: e instanceof ErreurApi ? e.message : "refus" },
      { status: e instanceof ErreurApi ? e.statut : 502 },
    )
  }
}
