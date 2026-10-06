import { variableRequise } from "@/lib/env"

/**
 * Réveiller le service pendant qu'on saisit son mot de passe.
 *
 * Render endort un service gratuit au bout de quinze minutes d'inactivité, et
 * le réveil prend une cinquantaine de secondes. C'est le point resté ouvert
 * depuis le 22 septembre, et c'est lui qui est derrière la moitié des « ça
 * dure » de cette semaine : le cachet qui finissait sur un écran d'erreur, les
 * rubriques de l'administration qui mettaient une éternité, l'annuaire qui ne
 * venait pas.
 *
 * Le remède est simple parce que le moment est connu. Personne n'arrive dans
 * l'application sans passer par la connexion ou l'inscription, et il s'y passe
 * vingt à quarante secondes — le temps de taper une adresse et un mot de
 * passe. C'est exactement la durée du réveil. On le lance donc à l'ouverture
 * de l'écran, et le service est debout quand la session s'ouvre.
 *
 * Par ce détour plutôt que depuis le navigateur : `API_URL` reste privée.
 * L'adresse du service n'a pas à être publique, et la rendre publique pour
 * gagner un aller-retour serait un mauvais marché.
 *
 * Rien n'est attendu et rien n'échoue. Si le service dort encore, la page
 * suivante attendra comme avant ; si le réveil échoue, personne n'a besoin de
 * le savoir — ce n'est pas une fonctionnalité, c'est une politesse.
 */
export async function GET(): Promise<Response> {
  try {
    const base = variableRequise("API_URL").replace(/\/+$/, "")

    // Six secondes, et on raccroche. On ne veut pas la réponse : on veut que
    // la requête ARRIVE, ce qui suffit à Render pour rallumer le service.
    // Attendre la fin tiendrait une connexion ouverte cinquante secondes pour
    // un résultat dont personne ne fait rien.
    const controleur = new AbortController()
    const minuterie = setTimeout(() => controleur.abort(), 6000)

    await fetch(`${base}/sante`, {
      signal: controleur.signal,
      cache: "no-store",
    }).catch(() => null)

    clearTimeout(minuterie)
  } catch {
    // Variable absente, réseau coupé : sans conséquence.
  }

  return new Response(null, { status: 204 })
}
