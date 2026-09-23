/**
 * Lecture des variables d'environnement avec un message utile quand elles
 * manquent.
 *
 * Sans ce contrôle, l'application renvoie « Your project's URL and Key are
 * required to create a Supabase client! » — un message qui ne dit ni quelle
 * variable manque, ni où l'écrire. C'est la première erreur que rencontre
 * quiconque clone ce dépôt ; elle mérite d'être explicite.
 */

function manquante(nom: string): Error {
  return new Error(
    [
      `Variable d'environnement manquante : ${nom}`,
      "",
      "En local  : copie .env.local.example vers .env.local et remplis-la.",
      "Sur Vercel: Project Settings → Environment Variables, puis redéploie.",
      "",
      "Les clés Supabase sont dans Project Settings → API.",
    ].join("\n"),
  )
}

/**
 * Une variable lue côté serveur, par son nom.
 *
 * À N'UTILISER QUE SUR LE SERVEUR. Dans le navigateur, `process` n'existe
 * pas : Next.js ne remplace `process.env.NEXT_PUBLIC_QUELQUE_CHOSE` par sa
 * valeur que lorsque l'expression est écrite telle quelle dans le code. Un
 * accès calculé — `process.env[nom]` — ne peut pas être analysé, reste dans le
 * paquet tel quel, et lève « process is not defined » chez la personne qui
 * utilise l'application.
 *
 * C'est exactement ce qui empêchait toute photo de profil de partir : le
 * client Supabase du navigateur était construit par cette fonction, et sa
 * première ligne levait avant même que le fichier soit mis en file.
 *
 * Pour le navigateur, passer par `valeurRequise` et lui donner la lecture
 * littérale.
 */
export function variableRequise(nom: string): string {
  if (typeof process === "undefined" || !process.env) {
    throw new Error(
      `variableRequise("${nom}") a été appelée dans le navigateur. ` +
        "Utilisez valeurRequise(nom, process.env.NOM_ECRIT_EN_ENTIER) : " +
        "Next.js ne remplace que les lectures littérales.",
    )
  }

  const valeur = process.env[nom]
  if (!valeur) throw manquante(nom)
  return valeur
}

/**
 * Une variable déjà lue, vérifiée.
 *
 * L'appelant écrit `process.env.NEXT_PUBLIC_…` en toutes lettres — ce que
 * Next.js sait remplacer — et cette fonction ne fait que refuser le vide, avec
 * le même message que ci-dessus.
 */
export function valeurRequise(nom: string, valeur: string | undefined): string {
  if (!valeur) throw manquante(nom)
  return valeur
}
