/**
 * Lecture des variables d'environnement avec un message utile quand elles
 * manquent.
 *
 * Sans ce contrôle, l'application renvoie « Your project's URL and Key are
 * required to create a Supabase client! » — un message qui ne dit ni quelle
 * variable manque, ni où l'écrire. C'est la première erreur que rencontre
 * quiconque clone ce dépôt ; elle mérite d'être explicite.
 */
export function variableRequise(nom: string): string {
  const valeur = process.env[nom]

  if (!valeur) {
    throw new Error(
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

  return valeur
}
