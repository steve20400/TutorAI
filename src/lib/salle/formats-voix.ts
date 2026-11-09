/**
 * Les formats de la voix, et le nom de ses morceaux.
 *
 * À part, et sans aucune dépendance : c'est ce qui rend ces règles
 * vérifiables sans navigateur et sans base. `voix.ts` tient le micro et le
 * coffre ; ici on ne tient que des chaînes de caractères — mais ce sont
 * celles dont dépendent la lisibilité de l'enregistrement et la politique qui
 * le protège.
 */

/**
 * Les formats tentés, du meilleur au plus répandu.
 *
 * Opus d'abord : c'est le codec de la parole, il reste intelligible à
 * 16 kbit/s là où les autres bafouillent. `mp4` ferme la marche pour Safari,
 * qui a longtemps ignoré WebM.
 */
const FORMATS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
]

/**
 * Le premier format que ce navigateur sait écrire.
 *
 * `null` quand il n'en sait aucun — ce qui arrive, et qui doit se dire plutôt
 * que de laisser un enregistrement vide se constituer en silence.
 *
 * Pris en paramètre plutôt que lu globalement : c'est ce qui rend cette
 * fonction vérifiable sans navigateur.
 */
export function formatPrefere(
  supporte: (type: string) => boolean,
  formats: readonly string[] = FORMATS,
): string | null {
  for (const f of formats) if (supporte(f)) return f
  return null
}

/** L'extension qui va avec le format, pour que le coffre serve le bon type. */
export function extensionDe(format: string): string {
  if (format.startsWith("audio/ogg")) return "ogg"
  if (format.startsWith("audio/mp4")) return "m4a"
  return "webm"
}

/**
 * `<seance>/<auteur>/<rang>.<ext>`
 *
 * Les deux premiers dossiers ne sont pas décoratifs : la politique du coffre
 * les vérifie. Le second interdit de déposer du son dans la piste de
 * quelqu'un d'autre.
 *
 * Le rang est complété à six chiffres pour que l'ordre alphabétique des
 * fichiers soit l'ordre d'écoute — utile le jour où quelqu'un regarde le
 * coffre sans passer par la table.
 */
export function cheminDuMorceau(
  seanceId: string,
  auteur: string,
  rang: number,
  extension: string,
): string {
  return `${seanceId}/${auteur}/${String(rang).padStart(6, "0")}.${extension}`
}

/** Le type MIME nu, sans ses paramètres de codec. */
export function typeNu(format: string): string {
  return format.split(";")[0] ?? format
}
