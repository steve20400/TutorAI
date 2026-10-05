"use client"

import { useRef, useState } from "react"

import { supabaseNavigateur } from "@/lib/supabase/client"
import { useLangue } from "@/langues/contexte"

/** 8 Mo, comme le seau. Le refuser ici évite un aller-retour pour rien. */
const TAILLE_MAX = 8 * 1024 * 1024

const TYPES_ACCEPTES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]

type Cle = "cni" | "casier" | "diplome"

type Depose = { cle: Cle; nom: string }

/**
 * Les pièces, déposées AVANT que le compte n'existe.
 *
 * C'est tout le sujet : l'inscription ne demandait rien. On saisissait un
 * prénom, une adresse, un mot de passe, et un dossier apparaissait dans
 * l'espace d'administration avec strictement rien à vérifier. Nous vendons un
 * répétiteur vérifié ; là, personne n'était vérifiable.
 *
 * Le dépôt existait pourtant, mais après la connexion — donc après
 * l'inscription, donc après le moment où quelqu'un aurait pu renoncer.
 *
 * La difficulté est qu'à cet instant il n'y a ni compte, ni dossier au nom de
 * personne dans le seau. Le navigateur ouvre donc un dépôt provisoire désigné
 * par un jeton, téléverse sous `depots/<jeton>/`, et ce jeton voyage dans les
 * métadonnées de l'inscription. C'est le déclencheur qui crée la fiche qui
 * rattache les fichiers — aucune route ne peut dire « attache ce dépôt à ce
 * compte », donc personne ne peut glisser ses fichiers chez un autre. Toute
 * la règle est dans la migration 067.
 *
 * Le jeton n'est tiré qu'au premier fichier choisi : ouvrir un dépôt pour
 * chaque visiteur qui regarde la page remplirait la table de jetons morts, et
 * son plafond horaire se fermerait sur les vrais candidats.
 *
 * Rien n'est relu. Le seau n'autorise pas la lecture de ce qu'on y dépose —
 * ni ici, ni plus tard une fois connecté. Une pièce déposée par erreur se
 * remplace, elle ne se consulte pas. L'écran ne garde donc que le nom du
 * fichier, pour dire « celui-là est parti ».
 */
export function PiecesInscription() {
  const { d } = useLangue()
  const t = d.inscriptionPieces

  const [jeton, poserJeton] = useState<string | null>(null)
  const [deposees, poserDeposees] = useState<Depose[]>([])
  const [enCours, poserEnCours] = useState<Cle | null>(null)
  const [souci, poserSouci] = useState<string | null>(null)

  // Le jeton ne doit être tiré qu'une fois, même si deux fichiers partent
  // dans la même seconde. L'état ne suffit pas : il n'est pas encore à jour
  // quand le second appel démarre.
  const tirage = useRef<Promise<string> | null>(null)

  async function jetonDuDepot(): Promise<string> {
    if (jeton) return jeton
    if (!tirage.current) {
      tirage.current = (async () => {
        const supabase = supabaseNavigateur()
        const { data, error } = await supabase.rpc("ouvrir_depot")
        if (error || !data) throw new Error(error?.message ?? "depot")
        poserJeton(data as string)
        return data as string
      })()
    }
    return tirage.current
  }

  async function deposer(cle: Cle, fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return
    poserSouci(null)

    for (const fichier of Array.from(fichiers)) {
      if (fichier.size > TAILLE_MAX) {
        poserSouci(t.tropLourde)
        return
      }
      // Certains appareils rendent un type vide pour un HEIC : on se rabat
      // alors sur l'extension plutôt que de refuser une photo valable.
      const extension = fichier.name.split(".").pop()?.toLowerCase() ?? ""
      const connu =
        TYPES_ACCEPTES.includes(fichier.type) ||
        ["jpg", "jpeg", "png", "webp", "heic", "pdf"].includes(extension)
      if (!connu) {
        poserSouci(t.mauvaisType)
        return
      }
    }

    poserEnCours(cle)
    try {
      const j = await jetonDuDepot()
      const supabase = supabaseNavigateur()

      for (const fichier of Array.from(fichiers)) {
        const extension = fichier.name.split(".").pop()?.toLowerCase() || "jpg"
        // L'instant dans le nom : deux dépôts du même type ne s'écrasent pas
        // dans le seau, et le seau n'autorise personne à effacer.
        const chemin = `depots/${j}/${cle}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${extension}`

        const { error: envoi } = await supabase.storage
          .from("pieces")
          .upload(chemin, fichier, {
            contentType: fichier.type || undefined,
          })
        if (envoi) throw new Error(envoi.message)

        const { error: declaration } = await supabase.rpc(
          "declarer_fichier_depose",
          { le_jeton: j, type_piece: cle, chemin_fichier: chemin },
        )
        if (declaration) throw new Error(declaration.message)

        poserDeposees((avant) => {
          // Un type simple se remplace, comme en base : montrer deux cartes
          // d'identité ferait croire que les deux comptent.
          const reste =
            cle === "diplome" ? avant : avant.filter((p) => p.cle !== cle)
          return [...reste, { cle, nom: fichier.name }]
        })
      }
    } catch (erreur) {
      console.error("[pieces] dépôt impossible :", erreur)
      poserSouci(t.echec)
    } finally {
      poserEnCours(null)
    }
  }

  // Le dépôt est asynchrone, l'événement ne l'est pas : on le lance sans
  // l'attendre, et les échecs remontent dans `souci`.
  const lancerLeDepot = (cle: Cle, fichiers: FileList | null) => {
    void deposer(cle, fichiers)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Le jeton part avec l'inscription. Sans valeur, le champ n'existe
          pas : un dépôt vide ne doit pas ressembler à un dépôt. */}
      {jeton ? <input type="hidden" name="depot" value={jeton} /> : null}

      <div>
        <p className="text-[14px] font-medium">{t.titre}</p>
        <p className="doux mt-1 text-[12.5px] leading-relaxed">{t.detail}</p>
      </div>

      <Zone
        cle="cni"
        titre={t.cni}
        aide={t.cniAide}
        marque={t.requise}
        multiple={false}
        enCours={enCours === "cni"}
        deposees={deposees.filter((p) => p.cle === "cni")}
        surChoix={lancerLeDepot}
        t={t}
      />
      <Zone
        cle="casier"
        titre={t.casier}
        aide={t.casierAide}
        marque={t.facultative}
        multiple={false}
        enCours={enCours === "casier"}
        deposees={deposees.filter((p) => p.cle === "casier")}
        surChoix={lancerLeDepot}
        t={t}
      />
      <Zone
        cle="diplome"
        titre={t.diplome}
        aide={t.diplomeAide}
        marque={t.facultative}
        multiple
        enCours={enCours === "diplome"}
        deposees={deposees.filter((p) => p.cle === "diplome")}
        surChoix={lancerLeDepot}
        t={t}
      />

      {souci ? (
        <p
          className="rounded-[9px] px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{
            background: "color-mix(in srgb, var(--voyant) 12%, transparent)",
            color: "var(--voyant)",
          }}
        >
          {souci}
        </p>
      ) : null}
    </div>
  )
}

function Zone({
  cle,
  titre,
  aide,
  marque,
  multiple,
  enCours,
  deposees,
  surChoix,
  t,
}: {
  cle: Cle
  titre: string
  aide: string
  marque: string
  multiple: boolean
  enCours: boolean
  deposees: Depose[]
  surChoix: (cle: Cle, f: FileList | null) => void
  t: ReturnType<typeof useLangue>["d"]["inscriptionPieces"]
}) {
  const champ = useRef<HTMLInputElement | null>(null)

  return (
    <div
      className="rounded-[11px] px-3.5 py-3"
      style={{
        background: "color-mix(in srgb, var(--texte) 4%, var(--fond))",
        border: "1px dashed var(--bordure)",
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[13.5px] font-medium">{titre}</span>
        <span className="doux text-[11px]">{marque}</span>
      </div>
      <p className="doux mt-0.5 text-[12px] leading-relaxed">{aide}</p>

      {deposees.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {deposees.map((p) => (
            <li
              key={p.nom}
              className="flex items-center gap-1.5 text-[12px]"
              style={{ color: "var(--accent-doux-texte)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="block shrink-0"
              >
                <path d="m4 12.5 5 5L20 6.5" />
              </svg>
              <span className="min-w-0 truncate">{p.nom}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={champ}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          surChoix(cle, e.target.files)
          // Remis à zéro : sans cela, rechoisir le même fichier après un
          // échec ne déclenche aucun événement, et le bouton paraît mort.
          e.target.value = ""
        }}
      />
      <button
        type="button"
        disabled={enCours}
        onClick={() => champ.current?.click()}
        className="mt-2.5 rounded-[8px] border px-3 py-1.5 text-[12.5px] transition hover:opacity-70 disabled:opacity-50"
        style={{ borderColor: "var(--bordure)" }}
      >
        {enCours
          ? t.envoi
          : deposees.length > 0
            ? multiple
              ? t.ajouter
              : t.remplacer
            : multiple
              ? t.choisirPlusieurs
              : t.choisir}
      </button>
    </div>
  )
}
