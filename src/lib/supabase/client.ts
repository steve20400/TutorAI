"use client"

import { createBrowserClient } from "@supabase/ssr"
import { variableRequise } from "../env"

/**
 * Client Supabase côté navigateur.
 * N'utilise QUE la clé anonyme. La clé de service ne doit jamais arriver ici :
 * elle contourne la RLS et donnerait accès aux données de tous les élèves.
 */
export function supabaseNavigateur() {
  return createBrowserClient(
    variableRequise("NEXT_PUBLIC_SUPABASE_URL"),
    variableRequise("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  )
}
