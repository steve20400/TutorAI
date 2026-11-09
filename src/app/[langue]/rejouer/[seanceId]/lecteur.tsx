"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"

import { Retour } from "@/composants/retour"
import { type Dictionnaire } from "@/langues"
import { depuisHexa, enOctets } from "@/lib/salle/octets"
import {
  avancer,
  dureeTotale,
  enHorloge,
  faudraitReconstruire,
  fenetre,
  VITESSES,
} from "@/lib/salle/relecture"
import { supabaseNavigateur } from "@/lib/supabase/client"
import { Calcul } from "../../salle/[seanceId]/calcul"
import { MainLevee } from "../../salle/[seanceId]/main-levee"
import { Texte } from "../../salle/[seanceId]/texte"
import { Traceur } from "../../salle/[seanceId]/traceur"

/**
 * Le lecteur d'une séance enregistrée.
 *
 * ── LES MÊMES FEUILLES QUE PENDANT LE COURS ──
 *
 * On ne redessine rien : ce sont les composants de la salle qui rejouent, en
 * lecture seule. Un trait relu doit être EXACTEMENT le trait tracé — avec sa
 * couleur, son épaisseur, sa courbe. Le moindre écart entre ce qu'on a vu et
 * ce qu'on relit abîmerait la seule chose qui fait la valeur d'une pièce :
 * qu'elle soit fidèle.
 *
 * ── RECULER, C'EST REPARTIR DE ZÉRO ──
 *
 * Yjs sait appliquer une mise à jour, pas la retirer. On garde donc des
 * documents vierges sous la main et on rejoue depuis le début jusqu'au point
 * voulu. Quelques milliers de mises à jour binaires prennent quelques
 * dizaines de millisecondes — moins que le temps de relâcher la souris.
 *
 * ── CE QUE LE LECTEUR NE FAIT PAS ──
 *
 * Il ne modifie rien, et il ne le peut pas : la table est en ajout seul, et
 * aucune politique n'autorise l'écriture depuis ici. C'est ce qui sépare une
 * relecture d'une retouche.
 */

const PAGE = 1000

type Feuille = { id: string; rang: number; titre: string | null; outil: string }
type Geste = { t: number; feuille: string; maj: Uint8Array }

export function Lecteur({
  seanceId,
  feuilles,
  titre,
  retourVers,
  d,
}: {
  seanceId: string
  feuilles: Feuille[]
  titre: string
  retourVers: string
  d: Dictionnaire
}) {
  const t = d.relecture
  const [gestes, poserGestes] = useState<Geste[] | null>(null)
  const [erreur, poserErreur] = useState(false)
  const [position, poserPosition] = useState(0)
  const [enLecture, poserLecture] = useState(false)
  const [vitesse, poserVitesse] = useState(1)
  const [active, poserActive] = useState(feuilles[0]?.id ?? null)
  const [, redessiner] = useState(0)

  // Un document par feuille, reconstruits à chaque retour en arrière.
  const docs = useRef(new Map<string, Y.Doc>())
  const presences = useRef(new Map<string, Awareness>())
  const applique = useRef(0)
  /** D'où l'on vient : c'est elle qui dit si l'on a reculé. */
  const precedente = useRef(0)

  const neufs = useCallback(() => {
    for (const p of presences.current.values()) p.destroy()
    for (const doc of docs.current.values()) doc.destroy()
    docs.current = new Map()
    presences.current = new Map()
    for (const f of feuilles) {
      const doc = new Y.Doc()
      docs.current.set(f.id, doc)
      // Les composants de la salle attendent une présence. En relecture elle
      // reste vide : personne n'écrit, personne n'a de curseur.
      presences.current.set(f.id, new Awareness(doc))
    }
    applique.current = 0
    precedente.current = 0
  }, [feuilles])

  // ── Charger la trace, par pages ─────────────────────────────────────────
  useEffect(() => {
    let vivant = true
    void (async () => {
      const supabase = supabaseNavigateur()
      const tout: Geste[] = []
      let depuis = 0

      try {
        for (;;) {
          const { data, error } = await supabase
            .from("traces_salle")
            .select("t_ms, feuille_id, maj")
            .eq("seance_id", seanceId)
            .order("t_ms", { ascending: true })
            .order("id", { ascending: true })
            .range(depuis, depuis + PAGE - 1)

          if (error) throw error
          const lot = (data ?? []) as {
            t_ms: number
            feuille_id: string
            maj: string
          }[]

          for (const l of lot) {
            tout.push({
              t: l.t_ms,
              feuille: l.feuille_id,
              // PostgREST rend un `bytea` en hexadécimal préfixé « \x ».
              maj: l.maj.startsWith("\\x") ? depuisHexa(l.maj) : enOctets(l.maj),
            })
          }

          if (lot.length < PAGE) break
          depuis += PAGE
        }
      } catch (e) {
        // Bruyant, et visible : une relecture vide qui devrait être pleine ne
        // se distingue pas d'une séance où rien ne s'est passé.
        console.error("[relecture] trace illisible :", e)
        if (vivant) poserErreur(true)
        return
      }

      if (!vivant) return
      neufs()
      poserGestes(tout)
    })()

    return () => {
      vivant = false
    }
  }, [seanceId, neufs])

  const duree = gestes ? dureeTotale(gestes) : 0

  // ── Appliquer ce qui est dû à la position courante ──────────────────────
  useEffect(() => {
    if (!gestes) return

    // Reculer impose de repartir d'un document vierge : Yjs sait appliquer
    // une mise à jour, pas la retirer. On rejoue alors depuis le début — ce
    // qui coûte quelques dizaines de millisecondes, moins que le temps de
    // relâcher la souris.
    if (faudraitReconstruire(precedente.current, position)) neufs()
    precedente.current = position

    const aFaire = fenetre(gestes, -1, position)
    for (let i = applique.current; i < aFaire.length; i++) {
      const g = gestes[aFaire[i] ?? 0]
      if (!g) continue
      const doc = docs.current.get(g.feuille)
      if (doc) Y.applyUpdate(doc, g.maj, "relecture")
    }
    applique.current = aFaire.length
    redessiner((n) => n + 1)
  }, [gestes, position, neufs])

  // ── L'horloge ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enLecture || duree === 0) return
    let precedent = performance.now()
    let image = 0

    const battre = (maintenant: number) => {
      const ecoule = maintenant - precedent
      precedent = maintenant
      poserPosition((p) => {
        const suivant = avancer(p, ecoule, vitesse, duree)
        if (suivant >= duree) poserLecture(false)
        return suivant
      })
      image = requestAnimationFrame(battre)
    }

    image = requestAnimationFrame(battre)
    return () => cancelAnimationFrame(image)
  }, [enLecture, vitesse, duree])

  const feuille = feuilles.find((f) => f.id === active)
  const doc = active ? docs.current.get(active) : undefined
  const presence = active ? presences.current.get(active) : undefined

  if (erreur) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-[20px] font-medium">{t.illisible}</h1>
        <p className="doux mt-2 text-[13px] leading-relaxed">
          {t.illisibleDetail}
        </p>
      </main>
    )
  }

  if (!gestes) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="cercle-attente" aria-label={d.commun.enCours} />
      </div>
    )
  }

  if (gestes.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <Retour vers={retourVers} />
        <h1 className="mt-3 text-[20px] font-medium">{t.vide}</h1>
        <p className="doux mt-2 text-[13px] leading-relaxed">{t.videDetail}</p>
      </main>
    )
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ background: "var(--salle-fond)", color: "var(--salle-encre)" }}
    >
      {/* ── La barre du haut, celle de la salle ── */}
      <header
        className="flex h-11 shrink-0 items-center gap-3 px-3.5"
        style={{ background: "var(--salle-barre)" }}
      >
        <Retour vers={retourVers} couleur="var(--salle-encre-douce)" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {titre}
        </span>
        <span
          className="shrink-0 text-[11px]"
          style={{ color: "var(--salle-encre-douce)" }}
        >
          {t.etiquette}
        </span>
      </header>

      {/* ── Les feuilles ── */}
      <div className="flex min-h-0 flex-1">
        <div
          className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 p-2"
          style={{ background: "var(--salle-bande)" }}
        >
          {feuilles.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => poserActive(f.id)}
              className="h-[34px] w-[46px] shrink-0 rounded-[6px] text-[9px] leading-tight"
              style={
                f.id === active
                  ? { background: "#e6ecf7", color: "var(--salle-encre)" }
                  : {
                      background: "var(--salle-vignette)",
                      color: "var(--salle-vignette-texte)",
                    }
              }
            >
              {d.salle.outils[f.outil as keyof typeof d.salle.outils] ?? f.outil}
            </button>
          ))}
        </div>

        <div
          className="relative min-h-0 flex-1"
          style={{ background: "var(--salle-plan)" }}
        >
          {doc && presence && feuille ? (
            feuille.outil === "calcul" ? (
              <Calcul doc={doc} presence={presence} role="rep" lecture d={d} />
            ) : feuille.outil === "traceur" ? (
              <Traceur doc={doc} role="rep" lecture d={d} />
            ) : feuille.outil === "texte" ? (
              <Texte doc={doc} lecture placeholder={d.salle.enoncePlaceholder} />
            ) : (
              <MainLevee doc={doc} presence={presence} role="rep" lecture />
            )
          ) : null}
        </div>
      </div>

      {/* ── La barre de lecture ── */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-3 px-3.5 py-3"
        style={{ background: "var(--salle-barre)" }}
      >
        <button
          type="button"
          onClick={() => poserLecture((v) => !v)}
          aria-label={enLecture ? t.pause : t.lire}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{
            background: "var(--salle-bouton)",
            color: "var(--salle-encre)",
          }}
        >
          {enLecture ? "❚❚" : "▶"}
        </button>

        <span
          className="shrink-0 font-mono text-[11.5px] tabular-nums"
          style={{ color: "var(--salle-encre-douce)" }}
        >
          {enHorloge(position)} / {enHorloge(duree)}
        </span>

        {/* Le rail. Reculer reconstruit les documents — c'est instantané, et
            c'est pour ça qu'on peut se permettre un rail libre plutôt que
            des sauts de dix secondes. */}
        <input
          type="range"
          min={0}
          max={duree}
          step={100}
          value={position}
          aria-label={t.position}
          onChange={(e) => {
            poserLecture(false)
            poserPosition(Number(e.target.value))
          }}
          className="min-w-[140px] flex-1"
          style={{ accentColor: "var(--salle-ambre)" }}
        />

        <div className="flex shrink-0 gap-1">
          {VITESSES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => poserVitesse(v)}
              className="rounded-[6px] px-2 py-1 text-[11px]"
              style={
                v === vitesse
                  ? { background: "var(--salle-encre)", color: "var(--salle-fond)" }
                  : {
                      background: "var(--salle-bouton)",
                      color: "var(--salle-encre)",
                    }
              }
            >
              ×{v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
