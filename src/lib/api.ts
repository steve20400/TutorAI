import { supabaseServeur } from "./supabase/server"
import { variableRequise } from "./env"

/**
 * Appels au service Tuteurs, depuis les composants serveur.
 *
 * Le jeton de la session est transmis tel quel dans `Authorization`. C'est
 * toute la mécanique : le service ne décide de rien, il retransmet ce jeton à
 * Postgres, qui applique ses politiques. Les règles de protection des élèves
 * restent écrites à un seul endroit.
 *
 * Ces appels partent du serveur Vercel et non du navigateur. Le jeton ne
 * traverse donc jamais l'appareil de l'élève pour aller vers Render, et
 * l'adresse du service n'a pas besoin d'être publique.
 */

/** Render endort un service gratuit après 15 min : le réveil prend ~50 s. */
const DELAI_MAX = 60_000

export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ErreurApi"
  }
}

async function jetonDeSession(): Promise<string | null> {
  const supabase = await supabaseServeur()
  // `getSession` lit le cookie sans le vérifier, ce qui suffit ici : ce n'est
  // pas nous qui décidons si le jeton est valide, c'est le service — et
  // derrière lui Postgres. Vérifier deux fois coûterait un aller-retour de
  // plus sans rien protéger.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function api<T>(
  chemin: string,
  options: {
    methode?: "GET" | "POST" | "PATCH" | "DELETE"
    corps?: unknown
    /** Certaines routes, comme l'annuaire, répondent sans session. */
    sansSession?: boolean
  } = {},
): Promise<T> {
  const { methode = "GET", corps, sansSession = false } = options

  const base = variableRequise("API_URL").replace(/\/+$/, "")
  const jeton = sansSession ? null : await jetonDeSession()

  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), DELAI_MAX)

  try {
    const reponse = await fetch(`${base}${chemin}`, {
      method: methode,
      headers: {
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
        ...(corps ? { "Content-Type": "application/json" } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: controleur.signal,
      // Jamais de cache : ces réponses dépendent de qui demande.
      cache: "no-store",
    })

    if (!reponse.ok) {
      const detail = (await reponse.json().catch(() => ({}))) as {
        erreur?: string
        message?: string
      }
      throw new ErreurApi(
        reponse.status,
        detail.erreur ?? "erreur_inconnue",
        detail.message ?? `Le service a répondu ${reponse.status}.`,
      )
    }

    return (await reponse.json()) as T
  } catch (erreur) {
    if (erreur instanceof ErreurApi) throw erreur
    // Un service endormi qui met plus d'une minute à se réveiller ressemble à
    // une panne. On le nomme, pour que l'écran puisse le dire autrement.
    if (erreur instanceof Error && erreur.name === "AbortError") {
      throw new ErreurApi(
        504,
        "service_endormi",
        "Le service met trop de temps à répondre.",
      )
    }
    throw new ErreurApi(
      502,
      "service_injoignable",
      "Le service est injoignable.",
    )
  }
}
