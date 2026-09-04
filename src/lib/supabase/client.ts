"use client"

import { createBrowserClient } from "@supabase/ssr"

/**
 * Client Supabase côté navigateur.
 * N'utilise QUE la clé anonyme. La clé de service ne doit jamais arriver ici :
 * elle contourne la RLS et donnerait accès aux données de tous les élèves.
 */
export function supabaseNavigateur() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
