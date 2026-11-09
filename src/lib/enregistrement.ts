/**
 * Ce que coûte un enregistrement, et ce qu'il faut de réseau pour le porter.
 *
 * ── POURQUOI UN MODULE À PART, ET TESTÉ ──
 *
 * L'administration choisit entre « le cahier seul », « avec le son » et
 * « avec l'image ». Ces trois choix n'ont pas le même prix, et l'écart est
 * de deux ordres de grandeur. Un réglage qui ne dit pas son prix est un
 * piège : on allume la vidéo en 720p un lundi, on découvre la facture de
 * stockage un mois plus tard, et on coupe l'enregistrement — donc la
 * promesse — pour des raisons de coût qu'on aurait pu voir venir.
 *
 * ── LE DÉBIT MONTANT COMPTE PLUS QUE LE STOCKAGE ──
 *
 * Au Cameroun, la contrainte n'est pas le disque, c'est le téléversement. Une
 * séance filmée à 600 kbit/s demande 600 kbit/s de montant CONTINU, des deux
 * côtés, pendant une heure. Sur une connexion mobile partagée, ça ne passe
 * pas — et un enregistrement qui n'arrive pas ne protège personne, tout en
 * ayant dégradé la séance pendant qu'il essayait.
 *
 * C'est pour ça que les deux chiffres sont rendus : le poids ET le montant
 * exigé. Le second est celui qui décide.
 *
 * ── POURQUOI LE SON D'ABORD ──
 *
 * Pour protéger un enfant, ce qu'un adulte lui DIT compte plus que son image.
 * Le son coûte un dixième de la vidéo et porte l'essentiel de ce qu'on
 * voudrait pouvoir relire. L'ordre des modes n'est donc pas un hasard : le
 * cahier, puis le son, puis l'image.
 */

export type ModeEnregistrement = "cahier" | "audio" | "video"

/** Du moins cher au plus cher, et du plus sûr au plus fragile. */
export const MODES: readonly ModeEnregistrement[] = ["cahier", "audio", "video"]

/**
 * Débits audio, en kbit/s.
 *
 * De la parole en Opus, pas de la musique. 16 est intelligible, 24 est
 * confortable, 32 est généreux. Au-delà, on paie pour une qualité qu'aucune
 * relecture de sécurité n'exploitera.
 */
export const DEBITS_AUDIO = [16, 24, 32] as const

/** Débits vidéo, en kbit/s. */
export const DEBITS_VIDEO = [150, 300, 600] as const

export const RESOLUTIONS = ["360p", "480p", "720p"] as const

export type DebitAudio = (typeof DEBITS_AUDIO)[number]
export type DebitVideo = (typeof DEBITS_VIDEO)[number]
export type Resolution = (typeof RESOLUTIONS)[number]

/**
 * Le poids du cahier, en kilo-octets par heure.
 *
 * Ce n'est pas une estimation en l'air : une mise à jour Yjs d'un trait de
 * stylet pèse quelques dizaines d'octets, une frappe de texte quelques
 * octets, et une heure de cours dense en produit quelques milliers. On arrondi
 * vers le haut — un chiffre optimiste dans un écran de coût ne sert personne.
 */
const CAHIER_KO_PAR_HEURE = 400

/** kbit/s pendant une heure → mégaoctets. */
function kbitsEnMo(kbits: number): number {
  return (kbits * 3600) / 8 / 1024
}

/**
 * Ce qu'une heure de cours pèse, en mégaoctets.
 *
 * Le cahier est toujours compté : même en vidéo, la trace des gestes continue
 * d'être gardée. C'est elle qu'on rejoue ; l'image vient par-dessus.
 */
export function poidsParHeure(
  mode: ModeEnregistrement,
  debitAudio: number,
  debitVideo: number,
): number {
  let mo = CAHIER_KO_PAR_HEURE / 1024
  if (mode === "audio" || mode === "video") mo += kbitsEnMo(debitAudio)
  if (mode === "video") mo += kbitsEnMo(debitVideo)
  return Math.round(mo * 10) / 10
}

/**
 * Le débit montant exigé de CHAQUE participant, en kbit/s.
 *
 * Le cahier ne compte pas ici : il part par bouffées de quelques centaines
 * d'octets toutes les deux secondes, ce qu'une connexion même mauvaise avale
 * sans y penser. Le son et l'image, eux, exigent un débit CONTINU — et c'est
 * ce continu qui casse une séance quand il n'est pas tenu.
 */
export function montantRequis(
  mode: ModeEnregistrement,
  debitAudio: number,
  debitVideo: number,
): number {
  if (mode === "cahier") return 0
  if (mode === "audio") return debitAudio
  return debitAudio + debitVideo
}

/**
 * Ce débit vidéo peut-il porter cette résolution ?
 *
 * 720p à 150 kbit/s donne une bouillie où l'on ne reconnaît pas un visage —
 * donc un enregistrement de sécurité qui ne sécurise rien, au prix du
 * stockage et du réseau quand même. Mieux vaut filmer en 360p lisible qu'en
 * 720p illisible, et l'écran doit le dire au lieu de laisser faire.
 */
const MINIMUM_PAR_RESOLUTION: Record<Resolution, number> = {
  "360p": 150,
  "480p": 300,
  "720p": 600,
}

export function resolutionTenable(
  resolution: string,
  debitVideo: number,
): boolean {
  const minimum = MINIMUM_PAR_RESOLUTION[resolution as Resolution]
  if (minimum === undefined) return true
  return debitVideo >= minimum
}

/** Le débit minimum qui rend cette résolution lisible, ou 0 si inconnue. */
export function minimumPour(resolution: string): number {
  return MINIMUM_PAR_RESOLUTION[resolution as Resolution] ?? 0
}

/**
 * « 132,4 Mo » ou « 1,3 Go ».
 *
 * À partir du millier, on change d'unité : « 2640 Mo par heure » ne se
 * compare pas d'un coup d'œil à « 10,5 Mo par heure », et c'est précisément
 * cette comparaison qu'on veut rendre évidente.
 */
export function enTaille(mo: number, langue: string): string {
  const nombre = (n: number, d: number) =>
    n.toLocaleString(langue === "en" ? "en" : "fr-FR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  if (mo >= 1024) return `${nombre(mo / 1024, 1)} Go`
  if (mo >= 100) return `${nombre(mo, 0)} Mo`
  return `${nombre(mo, 1)} Mo`
}
