import { supabaseNavigateur } from "@/lib/supabase/client"
import {
  cheminDuMorceau,
  extensionDe,
  formatPrefere,
  typeNu,
} from "./formats-voix"
import {
  aJeterEnTete,
  estUnRefus,
  inutileDEssayer,
  prochainDelai,
} from "./reprise"

/**
 * La parole de la séance, captée par morceaux.
 *
 * ── POURQUOI LE SON, ET POURQUOI MAINTENANT ──
 *
 * La trace des gestes rejoue le cahier : les traits, les formules, les
 * courbes. Elle dit ce qui a été ÉCRIT. Pour protéger un enfant seul avec un
 * adulte, c'est la PAROLE qui compte — un cahier de mathématiques impeccable
 * ne prouve rien sur le ton employé ni sur ce qui a été demandé à l'élève.
 *
 * Et le son coûte un dixième de la vidéo. C'est la meilleure protection par
 * franc dépensé, et la seule qui tienne sur un réseau camerounais.
 *
 * ── EN MORCEAUX, ET C'EST TOUT L'INTÉRÊT ──
 *
 * On n'envoie pas un fichier d'une heure à la fin. Une coupure ne coûte qu'un
 * morceau ; un onglet fermé brutalement ne coûte que les dernières secondes ;
 * et le téléversement s'étale au lieu de tomber d'un bloc après la séance,
 * quand plus personne ne regarde l'écran pour s'apercevoir qu'il a échoué.
 *
 * ── CE QUI ÉCHOUE LE DIT ──
 *
 * Un micro refusé, un morceau qui ne part pas, un navigateur qui ne sait pas
 * encoder : chacun remonte par `surEtat` et s'affiche dans la salle. Une
 * séance qu'on croit enregistrée et qui ne l'est pas est pire qu'une séance
 * dont on sait qu'elle ne l'est pas — c'est la leçon de `enregistrement_url`,
 * et on ne la réapprendra pas deux fois.
 */

/**
 * Quinze secondes par morceau.
 *
 * Plus court multiplierait les requêtes et les lignes pour rien. Plus long
 * augmenterait ce qu'une coupure emporte : à une minute, un réseau qui tombe
 * au mauvais moment coûte une minute de parole — c'est long, à l'écoute,
 * quand c'est le passage qu'on cherchait.
 */
const MORCEAU_MS = 15_000

export type EtatVoix =
  /** Le mode ne capte pas la parole. */
  | "eteinte"
  /** On attend la réponse au bandeau du navigateur. */
  | "demande"
  /** Refusé, ou aucun micro. La séance continue, sans sa voix. */
  | "refusee"
  /** Ce navigateur ne sait pas encoder de son. */
  | "impossible"
  /** Tout va bien : ça enregistre. */
  | "capte"
  /** Ça enregistre, mais des morceaux ne partent pas. */
  | "en_retard"
  /** Le réseau est tombé : on enregistre, on garde, on attend. */
  | "en_pause"

type Morceau = {
  rang: number
  tMs: number
  dureeMs: number
  donnees: Blob
  essais: number
}

export type Voix = {
  /** Arrête le micro, dépose ce qui reste, et rend la main. */
  fermer: () => Promise<void>
}

/**
 * Ouvre le micro et commence à déposer.
 *
 * Rend toujours un objet, même quand rien n'est capté : l'appelant n'a pas à
 * distinguer « pas de micro » de « micro refusé » pour savoir s'il doit
 * fermer. C'est `surEtat` qui dit ce qui se passe, et l'écran l'affiche.
 */
export async function ouvrirLaVoix({
  seanceId,
  moi,
  debutMs,
  debitAudio,
  surEtat,
}: {
  seanceId: string
  moi: string
  /** L'ouverture de la séance : les morceaux portent leur position depuis là. */
  debutMs: number
  /** En kbit/s, tel que l'administration l'a réglé. */
  debitAudio: number
  surEtat?: (etat: EtatVoix) => void
}): Promise<Voix> {
  const muet: Voix = { fermer: async () => undefined }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof MediaRecorder === "undefined"
  ) {
    surEtat?.("impossible")
    return muet
  }

  const format = formatPrefere((t) => MediaRecorder.isTypeSupported(t))
  if (!format) {
    surEtat?.("impossible")
    return muet
  }

  surEtat?.("demande")

  let flux: MediaStream
  try {
    flux = await navigator.mediaDevices.getUserMedia({
      // Les trois corrections comptent plus ici qu'ailleurs : on enregistre
      // une pièce, pas un podcast. Un larsen ou un souffle de ventilateur
      // rend un passage inécoutable le jour où il faudrait l'écouter.
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch (erreur) {
    // Refusé, pas de micro, ou page non sécurisée. Le dire, et continuer : une
    // séance sans son vaut mieux qu'une séance interrompue.
    console.error("[salle] micro indisponible :", erreur)
    surEtat?.("refusee")
    return muet
  }

  const extension = extensionDe(format)
  const typeFichier = typeNu(format)

  let rang = 0
  let debutDuMorceau = Date.now()
  const attente: Morceau[] = []
  let ferme = false

  const enregistreur = new MediaRecorder(flux, {
    mimeType: format,
    audioBitsPerSecond: debitAudio * 1000,
  })

  enregistreur.ondataavailable = (evenement: BlobEvent) => {
    const maintenant = Date.now()
    const donnees = evenement.data
    // Un morceau vide arrive quand le micro n'a rien reçu : on ne dépose pas
    // du silence encodé, mais on avance quand même l'horloge.
    if (donnees.size > 0) {
      // La vraie limite n'est pas un nombre d'essais, c'est la mémoire : un
      // onglet qui enfle finit tué par le système, et il emporte la séance
      // avec lui. Quand il faut jeter, on jette les PLUS ANCIENS — jeter les
      // plus récents reviendrait à ne jamais rattraper le retard.
      const jetes = aJeterEnTete(
        attente.map((m) => m.donnees.size),
        donnees.size,
      )
      if (jetes > 0) {
        const perdus = attente.splice(0, jetes)
        // Bruyamment, et en disant QUELLES secondes manquent : un
        // enregistrement troué qui sait où sont ses trous reste une pièce ;
        // un enregistrement troué qui l'ignore n'en est plus une.
        console.error(
          `[salle] mémoire saturée — ${String(jetes)} morceau(x) perdu(s), de ` +
            `${String(Math.round((perdus[0]?.tMs ?? 0) / 1000))} s à ` +
            `${String(Math.round(((perdus.at(-1)?.tMs ?? 0) + (perdus.at(-1)?.dureeMs ?? 0)) / 1000))} s`,
        )
      }

      attente.push({
        rang: rang++,
        tMs: Math.max(0, debutDuMorceau - debutMs),
        dureeMs: Math.max(1, maintenant - debutDuMorceau),
        donnees,
        essais: 0,
      })
    }
    debutDuMorceau = maintenant
    void vider()
  }

  enregistreur.onerror = (evenement: Event) => {
    console.error("[salle] l'enregistreur a lâché :", evenement)
    surEtat?.("impossible")
  }

  /**
   * Dépose ce qui attend, dans l'ordre, et ne renonce pas sur une coupure.
   *
   * ── LA DIFFÉRENCE QUI COMPTE ──
   *
   * Une coupure n'est pas un refus. La première version les traitait pareil
   * et abandonnait après quatre essais — soit une minute de réseau absent,
   * ce qui est COURT ici. Dix minutes de coupure effaçaient dix minutes de
   * parole, en silence, pendant que la salle affichait « micro actif ».
   *
   *   • Réseau tombé  → on garde, et on attend. Indéfiniment.
   *   • Base qui dit non → on renonce, et on le dit. Insister ne la fera pas
   *     changer d'avis, et pour un doublon ce serait même nuisible.
   *
   * ── UN SEUL VIDAGE À LA FOIS ──
   *
   * `enCoursDeVidage` empêche deux boucles concurrentes : la minuterie de
   * reprise et l'arrivée d'un morceau peuvent se déclencher ensemble, et
   * deux boucles sur la même file déposeraient deux fois le même morceau.
   */
  let enCoursDeVidage = false
  let minuterie: ReturnType<typeof setTimeout> | null = null

  function replanifier(essais: number): void {
    if (minuterie !== null || ferme) return
    minuterie = setTimeout(() => {
      minuterie = null
      void vider()
    }, prochainDelai(essais))
  }

  async function vider(): Promise<void> {
    if (enCoursDeVidage || attente.length === 0) return

    // Hors ligne : inutile de brûler un essai. On le dit, et la minuterie
    // reprendra — l'événement `online` la court-circuitera s'il arrive avant.
    if (inutileDEssayer(navigator.onLine)) {
      if (!ferme) surEtat?.("en_pause")
      replanifier(0)
      return
    }

    enCoursDeVidage = true
    try {
      const supabase = supabaseNavigateur()

      while (attente.length > 0) {
        const morceau = attente[0]
        if (!morceau) break
        const chemin = cheminDuMorceau(seanceId, moi, morceau.rang, extension)

        try {
          const { error: erreurCoffre } = await supabase.storage
            .from("voix")
            .upload(chemin, morceau.donnees, {
              contentType: typeFichier,
              // Jamais d'écrasement : un morceau déposé est une pièce. Si le
              // chemin existe déjà, c'est un doublon de reprise, pas une
              // correction — et le refus qui s'ensuit est la bonne réponse.
              upsert: false,
            })
          if (erreurCoffre) throw erreurCoffre

          const { error: erreurLigne } = await supabase
            .from("morceaux_voix")
            .insert({
              seance_id: seanceId,
              auteur: moi,
              rang: morceau.rang,
              t_ms: morceau.tMs,
              duree_ms: morceau.dureeMs,
              chemin,
              octets: morceau.donnees.size,
            })
          if (erreurLigne) throw erreurLigne

          attente.shift()
          if (attente.length === 0 && !ferme) surEtat?.("capte")
        } catch (erreur) {
          if (estUnRefus(erreur)) {
            // La base a tranché. On le dit, et on passe au suivant plutôt que
            // de bloquer toute la file sur un morceau qu'elle ne prendra
            // jamais.
            console.error(
              `[salle] morceau ${String(morceau.rang)} refusé, abandonné :`,
              erreur,
            )
            attente.shift()
            continue
          }

          // Le réseau. On GARDE, et on réessaiera — c'est tout l'objet de
          // cette reprise.
          morceau.essais += 1
          console.warn(
            `[salle] morceau ${String(morceau.rang)} en attente de réseau (essai ${String(morceau.essais)})`,
          )
          if (!ferme) {
            surEtat?.(inutileDEssayer(navigator.onLine) ? "en_pause" : "en_retard")
          }
          replanifier(morceau.essais)
          return
        }
      }
    } finally {
      enCoursDeVidage = false
    }
  }

  // Le retour du réseau relance tout de suite, sans attendre la minuterie.
  const auRetour = () => {
    if (minuterie !== null) {
      clearTimeout(minuterie)
      minuterie = null
    }
    void vider()
  }
  window.addEventListener("online", auRetour)

  enregistreur.start(MORCEAU_MS)
  surEtat?.("capte")

  return {
    async fermer() {
      ferme = true
      window.removeEventListener("online", auRetour)
      if (minuterie !== null) {
        clearTimeout(minuterie)
        minuterie = null
      }
      try {
        if (enregistreur.state !== "inactive") {
          // `stop()` provoque un dernier `ondataavailable` : on l'attend,
          // sans quoi les dernières secondes partiraient à la poubelle avec
          // l'onglet.
          const dernier = new Promise<void>((resoudre) => {
            enregistreur.onstop = () => {
              resoudre()
            }
          })
          enregistreur.stop()
          await dernier
        }
      } catch (erreur) {
        console.error("[salle] arrêt du micro :", erreur)
      }

      for (const piste of flux.getTracks()) piste.stop()
      await vider()
    },
  }
}
