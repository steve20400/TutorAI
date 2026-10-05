"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { supabaseNavigateur } from "@/lib/supabase/client"
import { remplir, type Dictionnaire, type Langue } from "@/langues"

export type Piece = {
  /**
   * Nul pour un type jamais déposé : la ligne existe quand même, et c'est
   * elle qui dit ce qu'on attend encore. Une absence de ligne ne dirait rien.
   */
  id: string | null
  cle: string
  libelle_fr: string
  libelle_en: string
  requise: boolean
  /** Un diplôme va par plusieurs ; une carte d'identité, non. */
  multiple: boolean
  statut: "deposee" | "lisible" | "illisible" | "refusee" | null
  motif: string | null
  deposee_le: string | null
  examinee_le: string | null
}

const TYPES_ACCEPTES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]

/** 8 Mo, comme le seau. Le refuser ici évite un aller-retour pour rien. */
const TAILLE_MAX = 8 * 1024 * 1024

/**
 * Le nom sous lequel le fichier est rangé.
 *
 * Le dossier porte l'identifiant du répétiteur, et c'est la politique de
 * stockage qui l'exige — sans elle, il pourrait écrire chez un autre.
 *
 * L'instant dans le nom évite qu'un second dépôt du même type écrase le
 * premier : la migration 020 refuse qu'on efface quoi que ce soit, une pièce
 * qui a servi à vérifier quelqu'un étant la preuve que la vérification a eu
 * lieu.
 *
 * Hors du composant, et pas seulement par propreté : le linter refuse un
 * appel impur dans le corps d'un composant, et il a raison de ne pas
 * distinguer un rendu d'un gestionnaire d'événement — c'est à nous de
 * l'écrire là où la question ne se pose pas.
 */
function cheminDuDepot(proprietaire: string, cle: string, fichier: File): string {
  const extension = fichier.name.split(".").pop()?.toLowerCase() || "jpg"
  return `${proprietaire}/${cle}-${Date.now()}.${extension}`
}

/**
 * Déposer ses pièces justificatives, et suivre ce qu'elles deviennent.
 *
 * Le fichier part directement du navigateur vers le seau privé, sous un
 * dossier au nom du répétiteur — c'est la politique de stockage qui l'y
 * enferme, pas ce code. Le service n'est prévenu qu'ensuite, et n'inscrit que
 * le chemin : le fichier ne transite pas par lui, ce qui lui éviterait de
 * porter des cartes d'identité en mémoire sans raison.
 *
 * Le nom du fichier porte l'instant : deux dépôts du même type ne s'écrasent
 * pas dans le seau. L'ancien reste — la migration 020 l'a voulu ainsi, une
 * pièce qui a servi à vérifier quelqu'un est la preuve que la vérification a
 * eu lieu.
 *
 * Ce qu'on affiche du verdict est volontairement plus large que dans
 * l'annuaire : « illisible, reprenez la photo » est exactement ce dont celui
 * qui a déposé a besoin, et exactement ce qu'un parent n'a pas à savoir.
 */
export function PiecesRepetiteur({
  pieces,
  verrouille,
  langue,
  d,
}: {
  pieces: Piece[]
  /** Dossier déjà validé : on ne remplace plus rien sans l'administration. */
  verrouille: boolean
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.repetiteurProfil.pieces
  const router = useRouter()
  // Repéré par la LIGNE et non par le type : trois diplômes partagent le
  // même type, et « Envoi… » se serait affiché sur les trois à la fois.
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : ""

  async function deposer(cle: string, fichier: File, ligne: string) {
    setErreur(null)

    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setErreur(t.mauvaisType)
      return
    }
    if (fichier.size > TAILLE_MAX) {
      setErreur(t.tropLourde)
      return
    }

    setEnCours(ligne)
    try {
      const supabase = supabaseNavigateur()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("sans session")

      const chemin = cheminDuDepot(user.id, cle, fichier)

      const { error } = await supabase.storage
        .from("pieces")
        .upload(chemin, fichier, { contentType: fichier.type, upsert: false })
      if (error) throw error

      const reponse = await fetch("/api/pieces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type_cle: cle, chemin }),
      })
      if (!reponse.ok) throw new Error(String(reponse.status))

      router.refresh()
    } catch {
      setErreur(t.echec)
    } finally {
      setEnCours(null)
    }
  }

  function etat(p: Piece): { texte: string; couleur: string } | null {
    switch (p.statut) {
      case "lisible":
        return {
          texte: remplir(t.lisible, { date: date(p.examinee_le) }),
          couleur: "var(--accent-doux-texte)",
        }
      case "deposee":
        return {
          texte: remplir(t.deposee, { date: date(p.deposee_le) }),
          couleur: "var(--texte-doux)",
        }
      case "illisible":
        return { texte: t.illisible, couleur: "var(--erreur-texte)" }
      case "refusee":
        return { texte: t.refusee, couleur: "var(--erreur-texte)" }
      default:
        return { texte: t.absente, couleur: "var(--texte-doux)" }
    }
  }

  return (
    <section className="carte p-5">
      <div className="text-[14px] font-medium">{t.titre}</div>
      <p className="doux mt-1 text-[12px] leading-relaxed">{t.detail}</p>

      {verrouille ? (
        <p
          className="mt-3 rounded-[8px] px-3 py-2 text-[11.5px] leading-relaxed"
          style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
        >
          {t.verrou}
        </p>
      ) : null}

      {erreur ? (
        <p className="mt-3 text-[12px]" style={{ color: "var(--erreur-texte)" }}>
          {erreur}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        {lignesAffichees(pieces).map((p) => {
          const e = etat(p)
          return (
            <li
              key={p.id ?? p.cle}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3"
              style={{ borderColor: "var(--bordure)" }}
            >
              <div className="min-w-[160px] flex-1">
                <div className="text-[13.5px] font-medium">
                  {langue === "fr" ? p.libelle_fr : p.libelle_en}
                  <span className="doux ml-2 text-[10.5px] font-normal">
                    {p.requise ? t.requise : t.facultative}
                  </span>
                </div>
                {e ? (
                  <p className="mt-0.5 text-[12px]" style={{ color: e.couleur }}>
                    {e.texte}
                  </p>
                ) : null}
                {p.motif ? (
                  <p
                    className="mt-0.5 text-[11.5px]"
                    style={{ color: "var(--erreur-texte)" }}
                  >
                    {remplir(t.motif, { motif: p.motif })}
                  </p>
                ) : null}
              </div>

              {!verrouille && p.bouton ? (
                <label className="bt3 cursor-pointer px-3 py-1.5 text-xs">
                  {enCours === (p.id ?? p.cle)
                    ? t.envoi
                    : p.multiple
                      ? t.ajouterUn
                      : p.statut
                        ? t.remplacer
                        : t.deposer}
                  <input
                    type="file"
                    accept={TYPES_ACCEPTES.join(",")}
                    className="hidden"
                    disabled={enCours !== null}
                    onChange={(ev) => {
                      const f = ev.target.files?.[0]
                      ev.target.value = ""
                      if (f) void deposer(p.cle, f, p.id ?? p.cle)
                    }}
                  />
                </label>
              ) : null}
            </li>
          )
        })}
      </ul>

      <p className="doux mt-4 text-[11.5px] leading-relaxed">{t.aide}</p>
    </section>
  )
}

type Ligne = Piece & { bouton: boolean }

/**
 * Ce qu'il faut afficher, maintenant qu'un type peut avoir trois pièces.
 *
 * Un type simple garde sa ligne unique, déposée ou non, avec son bouton. Un
 * type multiple montre ce qui a été déposé — sans bouton, chacune se remplace
 * mal, on en ajoute une autre — puis une dernière ligne vide qui porte
 * « Ajouter ». Sans elle, le bouton se répétait sur chaque diplôme : trois
 * boutons identiques pour un seul geste.
 *
 * L'ordre vient de la base (`types_pieces.ordre`) et n'est pas recalculé ici.
 */
function lignesAffichees(pieces: Piece[]): Ligne[] {
  const lignes: Ligne[] = []

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    if (!p.multiple) {
      lignes.push({ ...p, bouton: true })
      continue
    }

    // Jamais rien déposé : la ligne vide fait déjà office d'invitation.
    if (!p.id) {
      lignes.push({ ...p, bouton: true })
      continue
    }

    lignes.push({ ...p, bouton: false })

    // Dernière pièce de ce type : on referme le groupe par l'invitation.
    const suivante = pieces[i + 1]
    if (!suivante || suivante.cle !== p.cle) {
      lignes.push({
        ...p,
        id: null,
        statut: null,
        motif: null,
        deposee_le: null,
        examinee_le: null,
        bouton: true,
      })
    }
  }

  return lignes
}
