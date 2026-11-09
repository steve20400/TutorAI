import { supabaseNavigateur } from "@/lib/supabase/client"
import { type MorceauPiste } from "./relecture"

/**
 * Recoller la parole d'une séance, piste par piste.
 *
 * ── POURQUOI IL FAUT RECOLLER ──
 *
 * `MediaRecorder` ne produit pas des fichiers indépendants : seul le premier
 * morceau porte l'en-tête, les suivants sont des fragments. Un morceau isolé
 * ne s'ouvre dans aucun lecteur. Pour entendre une piste il faut donc
 * télécharger tous ses morceaux et les remettre bout à bout dans l'ordre.
 *
 * C'est le prix de la découpe — et elle valait son prix : sans elle, une
 * coupure réseau coûtait l'heure entière au lieu de quinze secondes.
 *
 * ── UNE PISTE PAR PERSONNE ──
 *
 * On ne mélange pas. Deux voix qui se superposent sur une piste unique ne
 * s'attribuent plus, et c'est précisément le passage qu'on viendrait écouter.
 * Chaque piste garde donc son nom, et l'écran dit qui parle.
 */

export type Piste = {
  auteur: string
  nom: string
  /** Les morceaux, dans l'ordre, avec leur place dans la séance. */
  morceaux: MorceauPiste[]
  /** Le fichier recollé, prêt à être joué. */
  url: string
}

type Ligne = {
  auteur: string
  rang: number
  t_ms: number
  duree_ms: number
  chemin: string
}

/**
 * Charge et recolle toutes les pistes d'une séance.
 *
 * Les noms viennent à part : la politique de lecture de `profils` ne laisse
 * pas forcément lire celui d'en face, et une piste intitulée par un
 * identifiant ne dit rien à un parent. Quand le nom manque, on garde une
 * étiquette neutre plutôt que d'afficher un UUID.
 */
export async function chargerLesPistes(
  seanceId: string,
  nomDe: (auteur: string) => string,
): Promise<Piste[]> {
  const supabase = supabaseNavigateur()

  const { data, error } = await supabase
    .from("morceaux_voix")
    .select("auteur, rang, t_ms, duree_ms, chemin")
    .eq("seance_id", seanceId)
    .order("auteur", { ascending: true })
    .order("rang", { ascending: true })

  if (error) throw error

  const parAuteur = new Map<string, Ligne[]>()
  for (const l of (data ?? []) as Ligne[]) {
    const liste = parAuteur.get(l.auteur) ?? []
    liste.push(l)
    parAuteur.set(l.auteur, liste)
  }

  const pistes: Piste[] = []

  for (const [auteur, lignes] of parAuteur) {
    const bouts: Blob[] = []
    const morceaux: MorceauPiste[] = []

    for (const l of lignes) {
      const { data: fichier, error: e } = await supabase.storage
        .from("voix")
        .download(l.chemin)

      if (e || !fichier) {
        // Un morceau manquant fait un TROU, pas une erreur : la piste reste
        // écoutable, et `tempsDansLaPiste` sait que ces secondes-là n'ont
        // rien à offrir. Le dire, parce qu'un trou silencieux ressemble à un
        // silence réel — et les deux ne veulent pas dire la même chose.
        console.error(`[relecture] morceau absent : ${l.chemin}`, e)
        continue
      }

      bouts.push(fichier)
      morceaux.push({ t: l.t_ms, duree: l.duree_ms })
    }

    if (bouts.length === 0) continue

    pistes.push({
      auteur,
      nom: nomDe(auteur),
      morceaux,
      url: URL.createObjectURL(new Blob(bouts, { type: bouts[0]?.type })),
    })
  }

  return pistes
}

/** Rend au navigateur ce qu'on lui a pris. */
export function libererLesPistes(pistes: readonly Piste[]): void {
  for (const p of pistes) URL.revokeObjectURL(p.url)
}
