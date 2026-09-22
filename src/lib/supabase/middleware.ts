import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Langue } from "@/langues"
import { variableRequise } from "../env"

/**
 * Routes accessibles sans être connecté, une fois le préfixe de langue retiré.
 * Tout le reste est protégé — fermé par défaut.
 */
const ROUTES_PUBLIQUES = ["/connexion", "/inscription", "/auth"]

/**
 * Rafraîchit la session à chaque requête et protège les routes.
 *
 * Sans ce middleware, le jeton d'accès expire et l'élève est déconnecté en
 * pleine séance. Il doit tourner sur toutes les routes sauf les fichiers
 * statiques et l'API (voir src/middleware.ts).
 */
export async function actualiserSession(
  requete: NextRequest,
  langue: Langue,
): Promise<NextResponse> {
  let reponse = NextResponse.next({ request: requete })

  const supabase = createServerClient(
    variableRequise("NEXT_PUBLIC_SUPABASE_URL"),
    variableRequise("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => requete.cookies.getAll(),
        setAll: (cookies) => {
          for (const { name, value } of cookies) {
            requete.cookies.set(name, value)
          }
          reponse = NextResponse.next({ request: requete })
          for (const { name, value, options } of cookies) {
            reponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser() valide le jeton auprès de Supabase. Ne pas remplacer par
  // getSession(), qui se contente de lire le cookie sans le vérifier.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const chemin = requete.nextUrl.pathname
  const sansLangue = chemin.slice(`/${langue}`.length) || "/"
  const estPublique = ROUTES_PUBLIQUES.some((r) => sansLangue.startsWith(r))

  if (!user && !estPublique) {
    const url = requete.nextUrl.clone()
    url.pathname = `/${langue}/connexion`
    // `suite` garde la langue : on doit pouvoir y revenir tel quel après
    // la connexion.
    url.searchParams.set("suite", chemin)
    return NextResponse.redirect(url)
  }

  if (user && estPublique) {
    const url = requete.nextUrl.clone()
    url.pathname = `/${langue}`
    url.search = ""
    return NextResponse.redirect(url)
  }

  return reponse
}
