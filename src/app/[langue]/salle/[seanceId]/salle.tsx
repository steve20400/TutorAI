"use client"

import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"
import type { Awareness } from "y-protocols/awareness"

import { supabaseNavigateur } from "@/lib/supabase/client"
import { ouvrirFeuille, type EtatTransport, type Salon } from "@/lib/salle/transport"
import { usePresenceSalle } from "@/lib/salle/presence-salle"
import { remplir, type Dictionnaire } from "@/langues"
import { type Role } from "@/lib/salle/couleurs"
import { MainLevee } from "./main-levee"
import { Texte } from "./texte"
import { Traceur } from "./traceur"
import { Calcul } from "./calcul"
import { Retour } from "@/composants/retour"
import { type ModeEnregistrement } from "@/lib/enregistrement"
import { ouvrirLaVoix, type EtatVoix, type Voix } from "@/lib/salle/voix"

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
  sortieVers,
  enregistre,
  modeEnregistrement,
  debitAudio,
  debutLe,
  d,
}: {
  seanceId: string
  feuilles: Feuille[]
  moi: { id: string; nom: string; estRepetiteur: boolean }
  /** Le parent et l'administration regardent sans écrire. */
  lecture: boolean
  titre: string
  /** Où l'on atterrit en quittant la salle si rien ne précède dans l'histoire. */
  sortieVers: string
  /**
   * Le module d'enregistrement est-il allumé ?
   *
   * Il décide du voyant. Le voyant brillait sans condition, alors que le
   * module est éteint par défaut — on annonçait donc un enregistrement à une
   * famille pendant que rien n'était capté. C'est exactement le genre de
   * mensonge qu'une application de protection ne peut pas se permettre.
   */
  enregistre: boolean
  /** Ce qui est capté : le cahier seul, la parole en plus, ou l'image aussi. */
  modeEnregistrement: ModeEnregistrement
  /** Le débit de la parole, en kbit/s, tel que l'administration l'a réglé. */
  debitAudio: number
  /**
   * L'ouverture de la séance, en ISO, ou `null` si elle n'a pas démarré.
   *
   * Une date et non des millisecondes : lire l'horloge est impur, et le
   * serveur n'a pas à le faire pendant son rendu. C'est le navigateur qui
   * convertit — et lui seul a besoin de savoir l'heure qu'il est.
   */
  debutLe: string | null
  d: Dictionnaire
}) {
  const t = d.salle

  // L'origine des temps de la trace. `useState` avec une fonction : on la lit
  // UNE fois, au montage, et non à chaque rendu — sans quoi chaque re-rendu
  // décalerait la position des gestes suivants.
  const [debutMs] = useState(() =>
    debutLe ? new Date(debutLe).getTime() : Date.now(),
  )

  // La liste vit : une feuille ajoutée par l'autre doit apparaître sans
  // recharger, et celle qu'on vient d'ajouter soi-même tout de suite.
  const [liste, poserListe] = useState(feuilles)
  const [active, poserActive] = useState<string | null>(feuilles[0]?.id ?? null)
  const [ajoute, poserAjoute] = useState(false)
  const [salon, poserSalon] = useState<{ doc: Y.Doc; presence: Awareness } | null>(null)
  const [etat, poserEtat] = useState<EtatTransport>("attente")
  const ouvert = useRef<Salon | null>(null)

  /**
   * Chacun sa couleur, et ce n'est pas décoratif : on voit qui a trouvé quoi,
   * et c'est ce qu'un parent relit après coup. Le rouge reste réservé au seul
   * enregistrement.
   */
  const role: Role = moi.estRepetiteur ? "rep" : "ele"

  // ── Ouvrir la feuille active, fermer la précédente ───────────────────────
  useEffect(() => {
    if (!active) return
    let vivant = true

    void (async () => {
      const salonOuvert = await ouvrirFeuille({
        feuilleId: active,
        seanceId,
        moi: { id: moi.id, nom: moi.nom, role },
        debutMs,
        // Celui qui regarde sans écrire n'enregistre rien : il n'a pas de
        // geste à déposer, et la politique le refuserait de toute façon.
        enregistre: enregistre && !lecture,
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
  }, [active, seanceId, moi.id, moi.nom, role, debutMs, enregistre, lecture])

  // ── Le micro ────────────────────────────────────────────────────────────
  //
  // Hors de l'effet des feuilles, et c'est voulu : la voix suit la SÉANCE, pas
  // la feuille. Changer de feuille en cours de cours ne doit pas couper
  // l'enregistrement, ni rouvrir le bandeau du navigateur à chaque fois.
  //
  // Celui qui regarde sans écrire n'enregistre rien : il n'était pas dans la
  // salle, et la politique refuserait son dépôt de toute façon.
  const [voix, poserVoix] = useState<EtatVoix>("eteinte")
  const capteLaVoix =
    enregistre && !lecture && modeEnregistrement !== "cahier"

  useEffect(() => {
    if (!capteLaVoix) {
      poserVoix("eteinte")
      return
    }
    let vivant = true
    let ouverte: Voix | null = null

    void (async () => {
      const v = await ouvrirLaVoix({
        seanceId,
        moi: moi.id,
        debutMs,
        debitAudio,
        surEtat: (e) => {
          if (vivant) poserVoix(e)
        },
      })
      if (!vivant) {
        void v.fermer()
        return
      }
      ouverte = v
    })()

    return () => {
      vivant = false
      // Fermer dépose les dernières secondes : quitter la salle ne doit pas
      // les coûter.
      if (ouverte) void ouverte.fermer()
    }
  }, [capteLaVoix, seanceId, moi.id, debutMs, debitAudio])

  const feuilleActive = liste.find((f) => f.id === active)

  // ── Qui est là, et sur quelle feuille ───────────────────────────────────
  const dansLaSalle = usePresenceSalle({
    seanceId,
    moi: { id: moi.id, nom: moi.nom },
    feuilleId: active,
  })

  // Celui qui est ailleurs. C'est le piège connu : le répétiteur dit
  // « regarde la courbe », l'élève est resté sur l'énoncé, et les deux parlent
  // de choses différentes pendant cinq minutes.
  const ailleurs = dansLaSalle.find(
    (q) => q.feuilleId && q.feuilleId !== active,
  )
  const feuilleDeLautre = ailleurs
    ? liste.find((f) => f.id === ailleurs.feuilleId)
    : undefined

  // ── Les feuilles ajoutées par l'autre ───────────────────────────────────
  useEffect(() => {
    const supabase = supabaseNavigateur()
    const canal = supabase
      .channel(`salle:${seanceId}:feuilles`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feuilles",
          filter: `seance_id=eq.${seanceId}`,
        },
        (charge) => {
          const f = charge.new as Feuille
          poserListe((avant) =>
            avant.some((x) => x.id === f.id)
              ? avant
              : [...avant, f].sort((a, b) => a.rang - b.rang),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [seanceId])

  async function ajouterFeuille(outil: string) {
    if (lecture || ajoute) return
    poserAjoute(true)
    try {
      const supabase = supabaseNavigateur()
      const rang = liste.reduce((m, f) => Math.max(m, f.rang), -1) + 1
      const { data, error } = await supabase
        .from("feuilles")
        .insert({ seance_id: seanceId, rang, outil })
        .select("id, rang, titre, outil")
        .maybeSingle()
      if (error || !data) throw new Error(error?.message ?? "feuille")

      const f = data as Feuille
      poserListe((avant) =>
        avant.some((x) => x.id === f.id) ? avant : [...avant, f],
      )
      // On la regarde : on vient de la demander, on ne la cherche pas dans la
      // bande ensuite.
      poserActive(f.id)
    } catch (erreur) {
      console.error("[salle] feuille impossible à ouvrir :", erreur)
    } finally {
      poserAjoute(false)
    }
  }

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ background: "var(--salle-fond)", color: "var(--salle-encre)" }}
    >
      {/* ── La barre du haut : 44 px à la maquette ── */}
      <header
        className="flex h-11 shrink-0 items-center gap-3 px-3.5"
        style={{ background: "var(--salle-barre)" }}
      >
        {/* La sortie. Il n'y en avait aucune : une fois entré dans la salle,
            on ne pouvait en partir qu'avec le bouton du navigateur — celui-là
            même qui, sur un Android, ferme l'onglet au lieu de remonter. */}
        <Retour vers={sortieVers} couleur="var(--salle-encre-douce)" />

        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {titre}
        </span>
        <span className="shrink-0 text-[11.5px]" style={{ color: "var(--salle-encre-douce)" }}>
          {feuilleActive
            ? `${t.feuille} ${feuilleActive.rang + 1} · ${t.outils[feuilleActive.outil as keyof typeof t.outils] ?? feuilleActive.outil}`
            : ""}
        </span>
      </header>

      {/* ── Le plan de travail. La page EST le plan de travail. ── */}
      <div className="relative min-h-0 flex-1" style={{ background: "var(--salle-plan)" }}>
        {salon && feuilleActive?.outil === "calcul" ? (
          <Calcul
            doc={salon.doc}
            presence={salon.presence}
            role={role}
            lecture={lecture}
            d={d}
          />
        ) : salon && feuilleActive?.outil === "traceur" ? (
          <Traceur doc={salon.doc} role={role} lecture={lecture} d={d} />
        ) : salon && feuilleActive?.outil === "texte" ? (
          <Texte doc={salon.doc} lecture={lecture} placeholder={t.enoncePlaceholder} />
        ) : salon ? (
          <MainLevee
            doc={salon.doc}
            presence={salon.presence}
            role={role}
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
              style={{ background: "var(--salle-vignette)", color: "var(--salle-encre-douce)" }}
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
            style={{ background: "var(--salle-ambre-fond)", color: "var(--salle-ambre)" }}
          >
            {t.horsLigne}
          </div>
        ) : null}
      </div>

      {/* ── Où est l'autre ──

          Le bandeau ambré de la maquette, 38 px. C'est le garde-fou de la
          séance : chacun choisit sa feuille librement, et sans cette ligne le
          répétiteur dit « regarde la courbe » à quelqu'un qui est resté sur
          l'énoncé. Le bouton y mène, il n'y traîne personne de force. */}
      {ailleurs ? (
        <div
          className="flex shrink-0 items-center gap-3 px-3.5 py-2.5 text-[11.5px]"
          style={{ background: "var(--salle-ambre-fond)", color: "var(--salle-ambre)" }}
        >
          <span className="min-w-0 flex-1 truncate">
            {remplir(t.estSurLaFeuille, {
              prenom: ailleurs.nom,
              feuille: feuilleDeLautre
                ? String(feuilleDeLautre.rang + 1)
                : "—",
            })}
          </span>
          <button
            type="button"
            onClick={() => poserActive(ailleurs.feuilleId)}
            className="shrink-0 rounded-[6px] border px-2.5 py-1 text-[11px]"
            style={{ borderColor: "var(--salle-ambre)" }}
          >
            {t.rejoindreFeuille}
          </button>
        </div>
      ) : dansLaSalle.length > 0 ? (
        <div
          className="flex shrink-0 items-center gap-2 px-3.5 py-2 text-[11.5px]"
          style={{ background: "var(--salle-bande)", color: "var(--salle-encre-douce)" }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--salle-eleve)" }}
          />
          {dansLaSalle.map((q) => q.nom).join(" · ")}
        </div>
      ) : null}

      {/* ── La bande des feuilles : vignettes de 54×38 ── */}
      <div
        className="flex shrink-0 gap-2 overflow-x-auto px-3.5 py-3"
        style={{ background: "var(--salle-bande)", scrollbarWidth: "none" }}
      >
        {liste.map((f) => {
          const choisie = f.id === active
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => poserActive(f.id)}
              className="h-[38px] w-[54px] shrink-0 rounded-[6px] text-[9.5px] leading-tight"
              style={{
                background: "var(--salle-vignette)",
                border: choisie ? "1px solid #e6ecf7" : "1px solid transparent",
                color: choisie ? "var(--salle-encre)" : "var(--salle-encre-douce)",
              }}
            >
              {f.rang + 1}
              <span className="block truncate px-1">
                {t.outils[f.outil as keyof typeof t.outils] ?? f.outil}
              </span>
            </button>
          )
        })}

        {/* Le « + » de la maquette, 38×38. Une salle se divise en feuilles
            pendant la séance, comme un enseignant divise son tableau à la
            craie — pas en l'ayant prévu à l'avance. */}
        {!lecture ? (
          <div className="flex shrink-0 gap-1.5">
            {(["main_levee", "calcul", "traceur", "texte"] as const).map((outil) => (
              <button
                key={outil}
                type="button"
                disabled={ajoute}
                onClick={() => void ajouterFeuille(outil)}
                title={remplir(t.ajouterFeuille, {
                  outil: t.outils[outil],
                })}
                className="h-[38px] w-[38px] shrink-0 rounded-[6px] text-[9.5px] leading-tight disabled:opacity-40"
                style={{ border: "1px dashed #2e3c58", color: "var(--salle-encre-douce)" }}
              >
                +
                <span className="block truncate px-0.5">{t.outils[outil]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Les outils ── */}
      <div
        className="flex shrink-0 items-center gap-2 px-3.5 py-3"
        style={{ background: "var(--salle-barre)" }}
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
          style={{ background: "var(--salle-bouton)", color: "var(--salle-encre)" }}
        >
          {t.annuler}
        </button>

        {/* Le voyant, et il ne brille que si quelque chose est capté.

            Il brillait sans condition. Le module est éteint par défaut : on
            affichait donc « La séance est enregistrée » à un enfant et à un
            répétiteur pendant que rien ne l'était. Et dans l'autre sens, le
            jour où le module s'allume, les deux doivent le savoir — on ne
            capte pas quelqu'un en silence. */}
        {/* L'état du micro, en toutes lettres.

            Un micro refusé qui ne se dit pas, c'est une séance qu'on croit
            enregistrée et qui ne l'est pas — exactement ce qui a fait croire
            pendant des mois que les cours étaient captés. L'élève comme le
            répétiteur doivent voir ce qui se passe, dans les deux sens : que
            ça enregistre, ou que ça n'enregistre pas. */}
        {voix !== "eteinte" ? (
          <span
            className="ml-auto flex shrink-0 items-center gap-1.5 truncate text-[11px]"
            style={{
              color:
                voix === "capte"
                  ? "var(--salle-encre-douce)"
                  : "var(--salle-ambre)",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
            </svg>
            {t.micro[voix]}
          </span>
        ) : null}

        <span
          className={`${voix === "eteinte" ? "ml-auto " : ""}h-2 w-2 shrink-0 rounded-full`}
          style={{
            background: enregistre
              ? "var(--salle-voyant)"
              : "var(--salle-bordure)",
          }}
          aria-label={enregistre ? t.enregistrement : t.sansEnregistrement}
          title={enregistre ? t.enregistrement : t.sansEnregistrement}
        />
      </div>
    </div>
  )
}
