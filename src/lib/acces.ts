/**
 * Qui a le droit d'aller où.
 *
 * Ce module ne dépend de rien — ni de Next, ni de Supabase, ni d'une requête.
 * C'est volontaire : la règle d'accès est la pièce la plus facile à casser
 * sans s'en apercevoir, et deux pannes d'affilée l'ont montré le même jour.
 * Sans dépendance, elle s'interroge directement dans un test.
 */

/**
 * Routes accessibles sans être connecté, une fois le préfixe de langue retiré.
 * Tout le reste est protégé — fermé par défaut.
 *
 * `/essai` en fait partie, et c'est tout son propos : quelqu'un qui entend
 * parler de TUTELA doit pouvoir voir le tuteur avant de donner quoi que ce
 * soit. Son plafond de jetons vit dans le service, pas dans cette liste.
 */
const ROUTES_PUBLIQUES = [
  "/connexion",
  "/inscription",
  "/auth",
  "/essai",
  "/mot-de-passe-oublie",
  "/nouveau-mot-de-passe",
]

/**
 * Celles que l'on n'écarte JAMAIS, session ouverte ou non.
 *
 * Être connecté n'a pas le même sens partout. Sur la connexion ou
 * l'inscription, une session veut dire « vous n'avez rien à faire ici » et on
 * renvoie chez soi. Sur le choix d'un nouveau mot de passe, elle veut dire
 * exactement l'inverse : c'est le lien du courriel qui vient de l'ouvrir, et
 * elle est la seule autorisation d'écrire.
 *
 * Cette distinction manquait, et le résultat était double. Le lien créait la
 * session, `/auth/confirm` renvoyait vers l'écran de saisie, et le middleware
 * l'écartait aussitôt : on se retrouvait connecté dans son espace sans avoir
 * vu le formulaire. Le mot de passe restait l'ancien. Puis, le clic semblant
 * n'avoir rien fait, on recliquait le même lien — qui ne sert qu'une fois et
 * répondait « expiré », à raison.
 *
 * Un ancien commentaire supposait ici que « le middleware ne voit pas encore
 * la session au premier passage ». Il la voit : `/auth/confirm` pose les
 * témoins sur la réponse de redirection, et le navigateur les renvoie.
 */
const ROUTES_SANS_ECART = ["/auth", "/nouveau-mot-de-passe"]

export type Decision =
  | "laisser"
  | "versInscription"
  | "versConnexion"
  | "versAccueil"

/**
 * Qui a le droit d'aller où — la décision seule, sans requête ni réseau.
 *
 * Elle est sortie de `actualiserSession` pour pouvoir être interrogée
 * directement : deux défauts de middleware en une journée, tous deux muets,
 * tous deux découverts par un utilisateur et non par nous. Une règle qu'on
 * peut lire à voix haute dans un test vaut mieux qu'une règle qu'on relit
 * dans un `if`.
 *
 * `chemin` est déjà débarrassé du préfixe de langue.
 */
export function decisionDeRoute(chemin: string, connecte: boolean): Decision {
  const publique = ROUTES_PUBLIQUES.some((r) => chemin.startsWith(r))
  const sansEcart = ROUTES_SANS_ECART.some((r) => chemin.startsWith(r))

  // Deux situations, deux portes.
  //
  // À la racine, personne ne « revient » : on ouvre l'application, ou on suit
  // un lien partagé dans un groupe. La quasi-totalité de ces gens n'ont pas
  // de compte, et la connexion est une porte fermée en guise d'accueil. Celui
  // qui en a un traverse l'inscription d'un clic.
  //
  // Sur une adresse précise — une séance, un dossier — c'est l'inverse : on
  // ne tombe pas dessus par hasard, on y revient. La connexion garde alors
  // `suite`, pour y ramener tel quel une fois la session ouverte.
  //
  // C'est ici que la décision se prend, et nulle part ailleurs : le
  // middleware s'exécute AVANT la page, donc une redirection posée dans
  // `[langue]/page.tsx` n'était jamais atteinte.
  if (!connecte && !publique) {
    return chemin === "/" ? "versInscription" : "versConnexion"
  }

  if (connecte && publique && !sansEcart) return "versAccueil"

  return "laisser"
}


/**
 * Y a-t-il seulement un témoin de session à vérifier ?
 *
 * Le middleware demandait « qui est-ce ? » à Supabase avant chaque page, y
 * compris pour un visiteur qui lit l'écran de connexion et n'a évidemment
 * personne à nommer. Un aller-retour à l'autre bout du monde, à chaque
 * navigation, pour une question dont la réponse est écrite dans la requête.
 *
 * Ce raccourci n'accorde jamais rien : il constate une absence. Un témoin
 * présent fait toujours l'appel, et c'est lui qui décide — un témoin périmé
 * ou fabriqué ne passe pas `getUser()`.
 *
 * `@supabase/ssr` nomme ses témoins `sb-<projet>-auth-token`, et les découpe
 * en `.0`, `.1` quand ils dépassent la taille d'un témoin. D'où la recherche
 * par fragment plutôt que par nom exact.
 */
export function porteUnTemoinDeSession(noms: readonly string[]): boolean {
  return noms.some((n) => n.startsWith("sb-") && n.includes("auth-token"))
}
