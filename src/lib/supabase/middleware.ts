import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Langue } from "@/langues"
import { decisionDeRoute, porteUnTemoinDeSession } from "../acces"
import { variableRequise } from "../env"

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
  //
  // Mais on ne demande pas « qui est-ce ? » quand il n'y a personne à
  // nommer. Sans témoin de session, il n'y a rien à vérifier : la question
  // ne peut avoir qu'une réponse, et on la pose quand même à l'autre bout du
  // monde. C'est un aller-retour réseau avant CHAQUE page, pour un visiteur
  // qui lit l'écran de connexion et n'a évidemment pas de session.
  //
  // Ce raccourci n'ouvre rien : il ne sert jamais à accorder un accès, mais à
  // constater une absence. Un témoin présent fait toujours l'appel.
  const aUnTemoin = porteUnTemoinDeSession(
    requete.cookies.getAll().map((c) => c.name),
  )

  const user = aUnTemoin ? (await supabase.auth.getUser()).data.user : null

  const chemin = requete.nextUrl.pathname
  const sansLangue = chemin.slice(`/${langue}`.length) || "/"

  switch (decisionDeRoute(sansLangue, Boolean(user))) {
    case "versInscription": {
      const url = requete.nextUrl.clone()
      url.pathname = `/${langue}/inscription`
      url.search = ""
      return NextResponse.redirect(url)
    }
    case "versConnexion": {
      const url = requete.nextUrl.clone()
      url.pathname = `/${langue}/connexion`
      // `suite` garde la langue : on doit pouvoir y revenir tel quel après
      // la connexion.
      url.searchParams.set("suite", chemin)
      return NextResponse.redirect(url)
    }
    case "versAccueil": {
      const url = requete.nextUrl.clone()
      url.pathname = `/${langue}`
      url.search = ""
      return NextResponse.redirect(url)
    }
    default:
      return reponse
  }
}
