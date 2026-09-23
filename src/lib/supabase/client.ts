"use client"

import { createBrowserClient } from "@supabase/ssr"
import { valeurRequise } from "../env"

/**
 * Client Supabase côté navigateur.
 * N'utilise QUE la clé anonyme. La clé de service ne doit jamais arriver ici :
 * elle contourne la RLS et donnerait accès aux données de tous les élèves.
 *
 * Les deux variables sont écrites en toutes lettres, et ce n'est pas un
 * hasard : Next.js ne remplace `process.env.NEXT_PUBLIC_…` par sa valeur que
 * si l'expression apparaît telle quelle. Les faire passer par une fonction qui
 * lit `process.env[nom]` laissait le paquet appeler `process` dans le
 * navigateur, où il n'existe pas — et aucune photo de profil ne partait.
 */
export function supabaseNavigateur() {
  return createBrowserClient(
    valeurRequise(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    valeurRequise(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  )
}
