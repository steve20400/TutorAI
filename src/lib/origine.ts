import { headers } from "next/headers"

/**
 * L'adresse publique du site, telle que la requête la voit.
 *
 * Elle sert à fabriquer les liens qu'on met dans les courriels. Ces liens
 * partent de notre serveur et reviennent chez nous : les écrire en dur
 * marcherait aujourd'hui sur Vercel et casserait le jour du domaine propre,
 * sans que rien ne prévienne — le message partirait, le lien mènerait
 * ailleurs.
 *
 * `localhost` est traité à part : en développement il n'y a pas de https, et
 * un lien en https ne s'ouvre jamais.
 */
export async function origineDuSite(): Promise<string> {
  const entetes = await headers()

  const origine = entetes.get("origin")
  if (origine) return origine

  const hote = entetes.get("host")
  if (hote) {
    const local = hote.startsWith("localhost") || hote.startsWith("127.0.0.1")
    return `${local ? "http" : "https"}://${hote}`
  }

  // Dernier recours : une requête sans en-tête `host` n'existe pas en HTTP/1.1,
  // mais si cela arrivait, mieux vaut une adresse configurée qu'une adresse
  // inventée.
  const configuree = process.env.NEXT_PUBLIC_SITE_URL
  if (!configuree) {
    throw new Error(
      "Impossible de déterminer l'adresse du site : ni en-tête `host`, ni NEXT_PUBLIC_SITE_URL.",
    )
  }
  return configuree.replace(/\/$/, "")
}
