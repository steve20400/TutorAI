import { supabaseServeur } from "@/lib/supabase/server"

/**
 * La révocation du jeton, après le départ.
 *
 * Le navigateur a déjà effacé son témoin et s'en va — voir `lib/sortie.ts`.
 * Il ne reste qu'à prévenir Supabase que le jeton de rafraîchissement ne sert
 * plus à rien. Personne n'attend cette réponse : elle part par `sendBeacon`,
 * que le navigateur livre pendant qu'il charge l'écran de connexion.
 *
 * Une route et non une action serveur, parce que `sendBeacon` envoie une
 * requête nue et ne sait rien du protocole des actions. Elle vit sous `/auth`,
 * que le middleware laisse passer sans préfixe de langue — ce chemin-là n'a
 * rien à afficher, donc rien à traduire.
 *
 * Pas de garde contre une requête d'un autre site : les témoins sont en
 * `SameSite=Lax`, qui ne les joint jamais à un POST venu d'ailleurs. Une telle
 * requête arriverait sans session, et déconnecterait personne.
 */
export async function POST(): Promise<Response> {
  try {
    const supabase = await supabaseServeur()
    await supabase.auth.signOut()
  } catch (e) {
    // Le départ a déjà eu lieu côté navigateur : on ne peut plus rien dire à
    // qui que ce soit. On le laisse dans les journaux, où il sera lu.
    console.error("[sortie] révocation impossible :", e)
  }

  return new Response(null, { status: 204 })
}
