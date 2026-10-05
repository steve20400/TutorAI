/**
 * Partir.
 *
 * Se déconnecter prenait le même chemin que se connecter : on envoyait une
 * action au serveur, qui demandait à Supabase de révoquer le jeton, qui
 * invalidait tout le cache, qui redirigeait, et le navigateur allait enfin
 * chercher l'écran de connexion. Trois allers-retours à la file. Steve a
 * décrit exactement ce que ça donne : « quand on clique sur déconnecter, ça
 * doit déconnecter directement ».
 *
 * Il a raison, et pas seulement sur le ressenti. Se connecter a besoin du
 * serveur — lui seul sait si le mot de passe est juste. Partir n'a besoin de
 * personne : ce qui fait qu'on est connecté ici, c'est le témoin déposé dans
 * ce navigateur. Il s'efface sur place, sans réseau, dans la même milliseconde
 * que le clic.
 *
 * Reste la révocation du jeton chez Supabase. Elle est nécessaire — un jeton
 * de rafraîchissement qui survit est un jeton qu'on pourrait rejouer — mais
 * elle n'est pas urgente, et surtout elle ne regarde pas celui qui part. Elle
 * se fait derrière, pendant qu'il s'en va.
 *
 * Ce module ne dépend de rien, comme `acces.ts` et pour la même raison : la
 * règle qui dit ce qu'est une session doit pouvoir se relire dans un test.
 * Elle est ici l'exacte réciproque de `porteUnTemoinDeSession` — ce que le
 * middleware cherche est ce que celui-ci efface, et les deux doivent le dire
 * de la même manière ou la déconnexion laisse derrière elle de quoi rentrer.
 */

/**
 * Les témoins de session présents dans un `document.cookie` brut.
 *
 * `@supabase/ssr` nomme les siens `sb-<projet>-auth-token`, et les découpe en
 * `.0`, `.1` au-delà de quatre kilo-octets — un jeton avec des métadonnées en
 * prend deux. N'en effacer qu'un laisserait une session à moitié là : le
 * middleware verrait encore un témoin et refuserait l'écran de connexion.
 */
export function temoinsDeSession(brut: string): string[] {
  return brut
    .split(";")
    .map((morceau) => morceau.split("=")[0]?.trim() ?? "")
    .filter((nom) => nom.startsWith("sb-") && nom.includes("auth-token"))
}

/**
 * L'instruction qui efface un témoin.
 *
 * Un témoin ne se supprime pas : on le réécrit vide et déjà périmé. Encore
 * faut-il viser le même — le navigateur ne remplace que si le nom ET le
 * chemin correspondent. `@supabase/ssr` pose les siens sur `/` sans domaine ;
 * écrire la même chose ici les atteint, écrire autre chose en créerait un
 * deuxième à côté du premier, qui resterait.
 */
export function effacement(nom: string): string {
  return `${nom}=; Max-Age=0; Path=/; SameSite=Lax`
}

/**
 * Efface la session de ce navigateur. Rend `false` si quelque chose a
 * survécu.
 *
 * Le retour n'est pas décoratif. Si un témoin résiste — un `Path` inattendu,
 * un `httpOnly` qu'une version future activerait — partir quand même mènerait
 * à l'écran de connexion, que le middleware renverrait aussitôt vers
 * l'accueil : on cliquerait « se déconnecter » pour se retrouver chez soi,
 * toujours connecté, sans un mot. L'appelant doit alors repasser par le
 * serveur, qui est lent mais qui, lui, ne peut pas échouer en silence.
 */
export function oublierLaSession(): boolean {
  for (const nom of temoinsDeSession(document.cookie)) {
    document.cookie = effacement(nom)
  }

  // Le client navigateur de `@supabase/ssr` range tout dans les témoins. Les
  // clés `sb-` d'un stockage local viendraient d'une version antérieure ou
  // d'une bibliothèque tierce ; elles ne doivent pas survivre à un départ.
  try {
    const restes = Object.keys(localStorage).filter((c) => c.startsWith("sb-"))
    for (const cle of restes) localStorage.removeItem(cle)
  } catch {
    // Navigation privée, stockage refusé : rien à oublier de ce côté-là.
  }

  const reste = temoinsDeSession(document.cookie)
  if (reste.length > 0) {
    console.error("[sortie] témoins impossibles à effacer :", reste)
    return false
  }
  return true
}
