"use client"

import { useActionState, useMemo, useState } from "react"
import { creerTuteur, type EtatCreation } from "../actions"

export type OptionProgramme = {
  id: string
  pays: string
  sous_systeme: string
  niveau: string
  matiere: string
}

const NOMS_PAYS: Record<string, string> = {
  CM: "Cameroun",
  CI: "Côte d'Ivoire",
}

const ETAT_INITIAL: EtatCreation = {}

const uniques = (valeurs: string[]) => [...new Set(valeurs)]

/**
 * Création du tuteur (docs/SPEC_APPLICATION.md §2.2).
 *
 * Les choix proposés viennent de la table `programmes`, jamais d'une liste
 * écrite en dur : on ne peut pas créer un tuteur pour une classe dont le
 * programme officiel n'est pas chargé.
 *
 * Une étape qui n'a qu'une seule réponse possible n'est pas affichée.
 */
export function Assistant({ options }: { options: OptionProgramme[] }) {
  const paysDisponibles = useMemo(
    () => uniques(options.map((o) => o.pays)),
    [options],
  )

  const [pays, setPays] = useState(
    paysDisponibles.length === 1 ? paysDisponibles[0] : "",
  )
  const [sousSysteme, setSousSysteme] = useState("")
  const [niveau, setNiveau] = useState("")
  const [matieres, setMatieres] = useState<string[]>([])

  const sousSystemesDisponibles = useMemo(
    () => uniques(options.filter((o) => o.pays === pays).map((o) => o.sous_systeme)),
    [options, pays],
  )

  // Résolu dès qu'il n'y a qu'un sous-système : le Cameroun en a deux
  // (francophone et anglophone), la Côte d'Ivoire un seul.
  const sousSystemeEffectif =
    sousSystemesDisponibles.length === 1
      ? sousSystemesDisponibles[0]
      : sousSysteme

  const niveauxDisponibles = useMemo(
    () =>
      uniques(
        options
          .filter(
            (o) => o.pays === pays && o.sous_systeme === sousSystemeEffectif,
          )
          .map((o) => o.niveau),
      ),
    [options, pays, sousSystemeEffectif],
  )

  const matieresDisponibles = useMemo(
    () =>
      options.filter(
        (o) =>
          o.pays === pays &&
          o.sous_systeme === sousSystemeEffectif &&
          o.niveau === niveau,
      ),
    [options, pays, sousSystemeEffectif, niveau],
  )

  const etapes = [
    ...(paysDisponibles.length > 1 ? (["pays"] as const) : []),
    ...(sousSystemesDisponibles.length > 1 ? (["sousSysteme"] as const) : []),
    "niveau" as const,
    "matieres" as const,
    "manuels" as const,
  ]

  const [indice, setIndice] = useState(0)
  const etape = etapes[Math.min(indice, etapes.length - 1)]

  const [etat, action, enCours] = useActionState(creerTuteur, ETAT_INITIAL)

  const suivant = () => setIndice((i) => Math.min(i + 1, etapes.length - 1))
  const precedent = () => setIndice((i) => Math.max(i - 1, 0))

  const basculerMatiere = (id: string) =>
    setMatieres((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="pt-6">
        <p className="text-xs uppercase tracking-wide opacity-50">
          Étape {Math.min(indice + 1, etapes.length)} sur {etapes.length}
        </p>
        <h1 className="mt-1 text-2xl font-medium">Créer ton tuteur</h1>
      </header>

      {etape === "pays" && (
        <Etape titre="Tu es dans quel pays ?">
          {paysDisponibles.map((p) => (
            <Choix
              key={p}
              actif={pays === p}
              onClick={() => {
                setPays(p)
                setSousSysteme("")
                setNiveau("")
                setMatieres([])
                suivant()
              }}
            >
              {NOMS_PAYS[p] ?? p}
            </Choix>
          ))}
        </Etape>
      )}

      {etape === "sousSysteme" && (
        <Etape titre="Tu suis quel système ?">
          {sousSystemesDisponibles.map((s) => (
            <Choix
              key={s}
              actif={sousSysteme === s}
              onClick={() => {
                setSousSysteme(s)
                setNiveau("")
                setMatieres([])
                suivant()
              }}
            >
              {s === "francophone" ? "Francophone" : "Anglophone"}
            </Choix>
          ))}
        </Etape>
      )}

      {etape === "niveau" && (
        <Etape titre="Tu es en quelle classe ?">
          {niveauxDisponibles.map((n) => (
            <Choix
              key={n}
              actif={niveau === n}
              onClick={() => {
                setNiveau(n)
                setMatieres([])
                suivant()
              }}
            >
              {n}
            </Choix>
          ))}
        </Etape>
      )}

      {etape === "matieres" && (
        <Etape titre="Quelles matières ?" aide="Une matière = un tuteur. Tu peux en choisir plusieurs.">
          {matieresDisponibles.map((o) => (
            <Choix
              key={o.id}
              actif={matieres.includes(o.id)}
              onClick={() => basculerMatiere(o.id)}
            >
              {o.matiere}
            </Choix>
          ))}
          <button
            type="button"
            disabled={matieres.length === 0}
            onClick={suivant}
            className="mt-2 rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-40"
          >
            Continuer
          </button>
        </Etape>
      )}

      {etape === "manuels" && (
        <form action={action} className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium">Tes manuels (facultatif)</h2>
            <p className="mt-1 text-sm opacity-70">
              Un titre par ligne. Ça aide ton tuteur à suivre la progression de
              ta classe. Tu peux passer cette étape.
            </p>
          </div>

          {matieres.map((id) => (
            <input key={id} type="hidden" name="programmeId" value={id} />
          ))}

          <textarea
            name="manuels"
            rows={3}
            placeholder={"CIAM Terminale D\nExcellence en maths Tle D"}
            className="rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-base outline-none transition focus:border-amber-600/60 focus:ring-2 focus:ring-amber-600/20 dark:border-white/20"
          />

          <div className="rounded-lg bg-black/[0.03] p-4 text-sm dark:bg-white/[0.05]">
            <div className="font-medium">Récapitulatif</div>
            <div className="mt-1 opacity-70">
              {NOMS_PAYS[pays] ?? pays} · {niveau}
            </div>
            <div className="opacity-70">
              {matieresDisponibles
                .filter((o) => matieres.includes(o.id))
                .map((o) => o.matiere)
                .join(", ")}
            </div>
          </div>

          {etat.erreur ? (
            <p
              role="status"
              className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
            >
              {etat.erreur}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enCours}
            className="rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-50"
          >
            {enCours ? "Création…" : "Créer mon tuteur"}
          </button>
        </form>
      )}

      {indice > 0 && (
        <button
          type="button"
          onClick={precedent}
          className="self-start text-sm opacity-60 underline underline-offset-4 hover:opacity-100"
        >
          Retour
        </button>
      )}
    </main>
  )
}

function Etape({
  titre,
  aide,
  children,
}: {
  titre: string
  aide?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium">{titre}</h2>
        {aide ? <p className="mt-1 text-sm opacity-70">{aide}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Choix({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={
        actif
          ? "rounded-xl border-2 border-amber-600/60 bg-amber-600/10 px-4 py-3 text-left font-medium"
          : "rounded-xl border border-black/10 px-4 py-3 text-left transition hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.04]"
      }
    >
      {children}
    </button>
  )
}
