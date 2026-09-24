import { NextResponse } from "next/server"

import { api, ErreurApi } from "@/lib/api"

export const runtime = "nodejs"

/**
 * Ouvre un essai sans compte.
 *
 * Simple relais : l'adresse du service n'est pas publique, et c'est lui qui
 * porte le plafond de jetons et le nombre d'essais par adresse.
 */
export async function POST() {
  try {
    const rendu = await api<{
      id: string
      jetonsRestants: number
      expireLe: string
    }>("/v1/essai", { methode: "POST", sansSession: true })

    return NextResponse.json(rendu)
  } catch (e) {
    const statut = e instanceof ErreurApi ? e.statut : 502
    return NextResponse.json(
      { erreur: e instanceof ErreurApi ? e.code : "indisponible" },
      { status: statut },
    )
  }
}
