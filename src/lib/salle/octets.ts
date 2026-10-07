/**
 * Des octets au texte, et retour.
 *
 * Yjs produit des octets ; Supabase Realtime transporte du JSON. Entre les
 * deux il faut du base64, et ce passage a l'air de rien alors qu'il est le
 * plus fragile de la salle : un aller-retour qui perd un octet ne casse rien
 * tout de suite — il casse la feuille du jour où quelqu'un a dessiné assez
 * longtemps.
 *
 * Sans dépendance, comme `acces.ts` et `surete.ts`, et pour la même raison :
 * ce qui doit être juste se vérifie dans un test, et un test n'a pas à
 * démarrer un navigateur pour lire quatre lignes.
 *
 * Le tiers de volume que coûte le base64 est accepté en connaissance de
 * cause : un trait de stylet fait quelques dizaines d'octets, et un tiers de
 * quelques dizaines reste quelques dizaines. Ce qu'on ne transmet JAMAIS,
 * c'est une image — on synchronise l'intention, pas le dessin.
 */

/**
 * `btoa` ne lit pas un tableau d'octets : il lit une chaîne où chaque
 * caractère vaut un octet. D'où le détour par `fromCharCode`, et surtout par
 * TRANCHES — passer cent mille octets d'un coup à `apply` dépasse la pile
 * d'appels sur certains navigateurs. C'est exactement le document le plus long
 * d'une vraie séance qui tombe, et jamais celui qu'on essaie en développant.
 */
export function enTexte(octets: Uint8Array): string {
  let s = ""
  const tranche = 0x8000
  for (let i = 0; i < octets.length; i += tranche) {
    s += String.fromCharCode(...octets.subarray(i, i + tranche))
  }
  return btoa(s)
}

export function enOctets(texte: string): Uint8Array {
  const binaire = atob(texte)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets
}

/**
 * La forme qu'attend PostgREST pour un `bytea` : `\x` suivi de l'hexadécimal.
 * Et la lecture inverse, pour ce qu'il rend.
 */
export function enHexa(octets: Uint8Array): string {
  return (
    "\\x" + Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("")
  )
}

export function depuisHexa(brut: string): Uint8Array {
  const hexa = brut.startsWith("\\x") ? brut.slice(2) : brut
  return Uint8Array.from(hexa.match(/../g) ?? [], (o) => parseInt(o, 16))
}
