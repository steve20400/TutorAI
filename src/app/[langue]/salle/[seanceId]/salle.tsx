"use client"

import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"
import type { Awareness } from "y-protocols/awareness"

import { ouvrirFeuille, type EtatTransport, type Salon } from "@/lib/salle/transport"
import { type Dictionnaire } from "@/langues"
import { MainLevee } from "./main-levee"

export type Feuille = {
  id: string
  rang: number
  titre: string | null
  outil: string
}

/**
 * La salle de cours, d'après `maquettes/salle-de-cours-telephone.svg`.
 *
 * ── LE RENVERSEMENT ──
 *
 * Sur Zoom ou Meet, la page est la vidéo et le tableau blanc est un mode. Ici
 * **la page est le plan de travail**, et la vidéo tient dans un coin. C'est le
 * différenciateur du produit, et c'est aussi pour cela que la maquette donne
 * 540 points sur 780 au plan de travail et deux vignettes de 58×44 aux
 * caméras.
 *
 * ── CE QUI EXISTE AUJOURD'HUI, ET CE QUI N'EXISTE PAS ──
 *
 * Une feuille à main levée, partagée et enregistrée. C'est la première, et ce
 * n'est pas un hasard : elle met à l'épreuve tout ce sur quoi le reste
 * reposera — le transport, la fusion hors ligne, la présence, la sauvegarde.
 * Le traceur, le calcul, l'énoncé et le partage d'écran viendront dans la même
 * coquille, chacun étant un type de feuille.
 *
 * Les emplacements des caméras sont dessinés et vides : il n'y a pas encore de
 * flux vidéo. Les dessiner vides plutôt que de les omettre, c'est dire la
 * forme finale — et ne pas avoir à tout redéplacer le jour où elles arrivent.
 *
 * ── CHACUN CHOISIT SA FEUILLE ──
 *
 * Indépendamment de l'autre, et c'est voulu. Le piège est connu : si le
 * répétiteur dit « regarde la courbe » et que l'élève est resté ailleurs, la
 * séance se casse en silence. D'où le bandeau ambré qui nomme la feuille où se
 * trouve l'autre, avec un bouton pour l'y rejoindre.
 */
export function Salle({
  seanceId,
  feuilles,
  moi,
  lecture,
  titre,
  d,
}: {
  seanceId: string
  feuilles: Feuille[]
  moi: { id: string; nom: string; estRepetiteur: boolean }
  /** Le parent et l'administration regardent sans écrire. */
  lecture: boolean
  titre: string
  d: Dictionnaire
}) {
  const t = d.salle

  const [active, poserActive] = useState(feuilles[0]?.id ?? null)
  const [salon, poserSalon] = useState<{ doc: Y.Doc; presence: Awareness } | null>(null)
  const [etat, poserEtat] = useState<EtatTransport>("attente")
  const ouvert = useRef<Salon | null>(null)

  /**
   * Chacun sa couleur, et ce n'est pas décoratif : on voit qui a trouvé quoi,
   * et c'est ce qu'un parent relit après coup. Le rouge reste réservé au seul
   * enregistrement.
   */
  const couleur = moi.estRepetiteur ? "#c9a227" : "#1f6b45"

  // ── Ouvrir la feuille active, fermer la précédente ───────────────────────
  useEffect(() => {
    if (!active) return
    let vivant = true

    void (async () => {
      const salonOuvert = await ouvrirFeuille({
        feuilleId: active,
        seanceId,
        moi: { nom: moi.nom, couleur },
        surEtat: (e) => {
          if (vivant) poserEtat(e)
        },
      })
      if (!vivant) {
        void salonOuvert.fermer()
        return
      }
      ouvert.current = salonOuvert
      poserSalon({ doc: salonOuvert.doc, presence: salonOuvert.presence })
    })()

    return () => {
      vivant = false
      poserSalon(null)
      const a = ouvert.current
      ouvert.current = null
      // Fermer enregistre une dernière fois : changer de feuille ne doit pas
      // coûter les deux dernières secondes de la précédente.
      if (a) void a.fermer()
    }
  }, [active, seanceId, moi.nom, couleur])

  const feuilleActive = feuilles.find((f) => f.id === active)

  // Qui est là, et sur quelle feuille. Le prénom vient de la présence : on ne
  // le demande pas au serveur, il voyage déjà avec le curseur.
  const autres = salon
    ? [...salon.presence.getStates().entries()]
        .filter(([id]) => id !== salon.doc.clientID)
        .map(([, e]) => (e as { qui?: { nom: string } }).qui?.nom)
        .filter((n): n is string => Boolean(n))
    : []

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ background: "#0d1524", color: "#e6ecf7" }}
    >
      {/* ── La barre du haut : 44 px à la maquette ── */}
      <header
        className="flex h-11 shrink-0 items-center gap-3 px-3.5"
        style={{ background: "#08101d" }}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {titre}
        </span>
        <span className="shrink-0 text-[11.5px]" style={{ color: "#8fa4c9" }}>
          {feuilleActive
            ? `${t.feuille} ${feuilleActive.rang + 1} · ${t.outils[feuilleActive.outil as keyof typeof t.outils] ?? feuilleActive.outil}`
            : ""}
        </span>
      </header>

      {/* ── Le plan de travail. La page EST le plan de travail. ── */}
      <div className="relative min-h-0 flex-1" style={{ background: "#101a2e" }}>
        {salon ? (
          <MainLevee
            doc={salon.doc}
            presence={salon.presence}
            couleur={couleur}
            lecture={lecture}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="cercle-attente" aria-hidden />
          </div>
        )}

        {/* Les deux emplacements de caméra, 58×44, dessinés et vides.
            Dire la forme finale plutôt que de tout redéplacer plus tard. */}
        <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="grid h-11 w-[58px] place-items-center rounded-[8px] text-[9px]"
              style={{ background: "#18243c", color: "#4e5e7d" }}
            >
              {t.cameraBientot}
            </div>
          ))}
        </div>

        {/* L'état du transport. Il ne s'affiche que s'il y a quelque chose à
            dire : « hors ligne, vos traits sont gardés » est exactement la
            différence entre une application cassée et une qui tient parole. */}
        {etat !== "ouvert" ? (
          <div
            className="absolute bottom-3 left-3 rounded-[8px] px-2.5 py-1.5 text-[11px]"
            style={{ background: "#181105", color: "#e8b366" }}
          >
            {t.horsLigne}
          </div>
        ) : null}
      </div>

      {/* ── Qui est là ── */}
      {autres.length > 0 ? (
        <div
          className="flex shrink-0 items-center gap-2 px-3.5 py-2 text-[11.5px]"
          style={{ background: "#0a1220", color: "#8fa4c9" }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#6fd3ab" }}
          />
          {autres.join(" · ")}
        </div>
      ) : null}

      {/* ── La bande des feuilles : vignettes de 54×38 ── */}
      <div
        className="flex shrink-0 gap-2 overflow-x-auto px-3.5 py-3"
        style={{ background: "#0a1220", scrollbarWidth: "none" }}
      >
        {feuilles.map((f) => {
          const choisie = f.id === active
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => poserActive(f.id)}
              className="h-[38px] w-[54px] shrink-0 rounded-[6px] text-[9.5px] leading-tight"
              style={{
                background: "#141f36",
                border: choisie ? "1px solid #e6ecf7" : "1px solid transparent",
                color: choisie ? "#e6ecf7" : "#8fa4c9",
              }}
            >
              {f.rang + 1}
              <span className="block truncate px-1">
                {t.outils[f.outil as keyof typeof t.outils] ?? f.outil}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Les outils ── */}
      <div
        className="flex shrink-0 items-center gap-2 px-3.5 py-3"
        style={{ background: "#08101d" }}
      >
        <button
          type="button"
          disabled={lecture || !salon}
          onClick={() => {
            // Annuler son propre trait, pas celui de l'autre. Yjs sait
            // distinguer : chaque mise à jour porte l'identité de qui l'a
            // faite, et retirer le dernier trait de l'autre serait effacer son
            // travail sans le lui dire.
            const traits = salon?.doc.getArray<unknown>("traits")
            if (!traits || traits.length === 0) return
            traits.delete(traits.length - 1, 1)
          }}
          className="rounded-[8px] px-3 py-2 text-[12px] disabled:opacity-40"
          style={{ background: "#16223a", color: "#e6ecf7" }}
        >
          {t.annuler}
        </button>

        <span
          className="ml-auto h-2 w-2 shrink-0 rounded-full"
          style={{ background: "#e04a32" }}
          aria-label={t.enregistrement}
          title={t.enregistrement}
        />
      </div>
    </div>
  )
}
