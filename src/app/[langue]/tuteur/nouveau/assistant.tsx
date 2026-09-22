"use client"

import { useActionState, useMemo, useState } from "react"

import { remplir } from "@/langues"
import { useLangue } from "@/langues/contexte"
import { Message } from "../../(auth)/champs"
import { creerTuteur, type EtatCreation } from "@/actions/tuteur"

export type OptionProgramme = {
  id: string
  pays: string
  sous_systeme: string
  niveau: string
  matiere: string
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
  const { langue, d } = useLangue()

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
          {remplir(d.tuteur.etapeSur, {
            n: Math.min(indice + 1, etapes.length),
            total: etapes.length,
          })}
        </p>
        <h1 className="mt-1 text-2xl font-medium">{d.tuteur.creerTitre}</h1>
      </header>

      {etape === "pays" && (
        <Etape titre={d.tuteur.quelPays}>
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
              {d.tuteur.pays[p] ?? p}
            </Choix>
          ))}
        </Etape>
      )}

      {etape === "sousSysteme" && (
        <Etape titre={d.tuteur.quelSysteme}>
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
              {s === "francophone" ? d.tuteur.francophone : d.tuteur.anglophone}
            </Choix>
          ))}
        </Etape>
      )}

      {etape === "niveau" && (
        <Etape titre={d.tuteur.quelleClasse}>
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
              {d.niveaux[n] ?? n}
            </Choix>
          ))}
        </Etape>
      )}

      {etape === "matieres" && (
        <Etape titre={d.tuteur.quellesMatieres} aide={d.tuteur.aideMatieres}>
          {matieresDisponibles.map((o) => (
            <Choix
              key={o.id}
              actif={matieres.includes(o.id)}
              onClick={() => basculerMatiere(o.id)}
            >
              {d.matieres[o.matiere] ?? o.matiere}
            </Choix>
          ))}
          <button
            type="button"
            disabled={matieres.length === 0}
            onClick={suivant}
            className="bouton mt-2 px-4 py-2.5"
          >
            {d.tuteur.continuer}
          </button>
        </Etape>
      )}

      {etape === "manuels" && (
        <form action={action} className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium">{d.tuteur.manuels}</h2>
            <p className="doux mt-1 text-sm">{d.tuteur.aideManuels}</p>
          </div>

          <input type="hidden" name="langue" value={langue} />
          {matieres.map((id) => (
            <input key={id} type="hidden" name="programmeId" value={id} />
          ))}

          <textarea
            name="manuels"
            rows={3}
            placeholder={"CIAM Terminale D\nExcellence en maths Tle D"}
            className="champ px-3 py-2.5"
          />

          <div className="carte p-4 text-sm">
            <div className="font-medium">{d.tuteur.recapitulatif}</div>
            <div className="doux mt-1">
              {d.tuteur.pays[pays] ?? pays} · {d.niveaux[niveau] ?? niveau}
            </div>
            <div className="doux">
              {matieresDisponibles
                .filter((o) => matieres.includes(o.id))
                .map((o) => d.matieres[o.matiere] ?? o.matiere)
                .join(", ")}
            </div>
          </div>

          <Message erreur={etat.erreur} />

          <button
            type="submit"
            disabled={enCours}
            className="bouton px-4 py-2.5"
          >
            {enCours ? d.tuteur.creation : d.tuteur.creerMonTuteur}
          </button>
        </form>
      )}

      {indice > 0 && (
        <button
          type="button"
          onClick={precedent}
          className="doux self-start text-sm underline underline-offset-4"
        >
          {d.tuteur.retour}
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
      className="choix-role text-left"
      style={
        actif
          ? {
              background: "var(--accent)",
              color: "var(--accent-texte)",
              fontWeight: 500,
            }
          : undefined
      }
    >
      {children}
    </button>
  )
}
