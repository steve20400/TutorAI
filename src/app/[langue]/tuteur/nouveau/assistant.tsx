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

/** Première lettre en majuscule, espaces en trop retirés. */
const propre = (v: string) => {
  const t = v.trim().replace(/\s+/g, " ")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * « Ce n'est pas dans la liste ? Écris-le. »
 *
 * Dans un vrai `<form>`, et non avec un écouteur de touche : la touche Entrée
 * dans un champ de formulaire est gérée par le navigateur depuis toujours, et
 * elle fonctionne même quand la liste de suggestions est ouverte — ce qui
 * n'était pas le cas en écoutant `keydown` ou `keyup` à la main.
 *
 * Les suggestions viennent de ce que d'autres ont déjà saisi : on propose,
 * on n'impose pas.
 */
function ChampLibre({
  etiquette,
  exemple,
  suggestions,
  identifiantListe,
  ajouterLibelle,
  onAjouter,
}: {
  etiquette: string
  exemple: string
  suggestions: string[]
  identifiantListe: string
  ajouterLibelle: string
  onAjouter: (valeur: string) => void
}) {
  const [saisie, setSaisie] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (saisie.trim().length < 1) return
        onAjouter(propre(saisie))
        setSaisie("")
      }}
      className="mt-1 flex flex-col gap-1.5"
    >
      <label className="doux text-[12px]">{etiquette}</label>
      <div className="flex gap-2">
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          list={identifiantListe}
          onKeyDown={(e) => {
            // Ceinture et bretelles. La soumission implicite par Entrée est
            // le comportement normal d'un champ dans un formulaire, mais
            // certains claviers de téléphone et certaines listes de
            // suggestions l'avalent. `requestSubmit` passe par le même
            // gestionnaire, donc par les mêmes contrôles.
            if (e.key !== "Enter") return
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }}
          maxLength={60}
          placeholder={exemple}
          className="champ min-w-0 flex-1 px-3 py-2 text-[14px]"
        />
        <datalist id={identifiantListe}>
          {suggestions.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={saisie.trim().length < 1}
          className="bt2 shrink-0 px-3 py-2 text-[13px]"
        >
          {ajouterLibelle}
        </button>
      </div>
    </form>
  )
}

/**
 * Création du tuteur (docs/SPEC_APPLICATION.md §2.2).
 *
 * Les choix proposés viennent de la table `programmes`, jamais d'une liste
 * écrite en dur : on ne peut pas créer un tuteur pour une classe dont le
 * programme officiel n'est pas chargé.
 *
 * Une étape qui n'a qu'une seule réponse possible n'est pas affichée.
 */
export function Assistant({
  options,
  catalogue,
  niveaux,
  paysEleve,
}: {
  options: OptionProgramme[]
  /**
   * Toutes les matières connues, programme chargé ou non.
   *
   * On ne recensera jamais tous les programmes de tous les pays avant
   * d'ouvrir. Un élève de cinquième qui veut réviser son anglais ne doit pas
   * se heurter à une porte fermée — il écrit sa matière, et elle entre au
   * catalogue pour l'élève suivant.
   */
  catalogue: string[]
  /**
   * Les classes du référentiel scolaire, de la sixième à la terminale.
   *
   * Elles ne dépendent d'aucun programme chargé : un élève de cinquième
   * existe même si personne n'a encore saisi le programme de cinquième.
   */
  niveaux: string[]
  /**
   * Le pays de l'élève, lu sur son profil.
   *
   * Il sert au récapitulatif et au choix par défaut. Le pays d'un programme
   * est autre chose : quand les deux diffèrent, on le dit au lieu de faire
   * croire à l'élève qu'il a changé de pays.
   */
  paysEleve: string
}) {
  const { langue, d } = useLangue()

  const paysDisponibles = useMemo(
    () => uniques(options.map((o) => o.pays)),
    [options],
  )

  const [pays, setPays] = useState(() => {
    // Son pays d'abord, s'il porte des programmes. Sinon le seul disponible,
    // en le signalant plus bas sur chaque matière.
    if (paysEleve && paysDisponibles.includes(paysEleve)) return paysEleve
    return paysDisponibles.length === 1 ? paysDisponibles[0] : ""
  })
  const [sousSysteme, setSousSysteme] = useState("")
  const [niveau, setNiveau] = useState("")
  const [matieres, setMatieres] = useState<string[]>([])
  /** Matières nommées par l'élève, faute de programme officiel. */
  const [libres, setLibres] = useState<string[]>([])
  const [saisieLibre, setSaisieLibre] = useState("")

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

  /**
   * Les classes proposées : celles du référentiel, plus celles qu'un
   * programme apporte et qui n'y figureraient pas — « Terminale D » n'est pas
   * « Terminale ».
   *
   * Le référentiel d'abord, parce qu'il porte l'ordre scolaire ; les autres
   * ensuite, dans l'ordre des programmes.
   */
  const niveauxDisponibles = useMemo(() => {
    const desProgrammes = options
      .filter((o) => o.pays === pays && o.sous_systeme === sousSystemeEffectif)
      .map((o) => o.niveau)

    return uniques([...niveaux, ...desProgrammes])
  }, [niveaux, options, pays, sousSystemeEffectif])

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

  /**
   * Ajoute une matière écrite par l'élève.
   *
   * On refuse un doublon de ce que le programme propose déjà : sans ce
   * contrôle, un élève créerait deux tuteurs de mathématiques, l'un avec
   * programme et l'autre sans, et ne comprendrait pas pourquoi l'un le suit
   * et pas l'autre.
   */
  const ajouterLibre = (matiere: string) => {
    if (matiere.length < 2) return

    // Un doublon de ce que le programme propose déjà est refusé : sinon un
    // élève créerait deux tuteurs de mathématiques, l'un qui suit sa classe
    // et l'autre non, sans comprendre la différence.
    const dejaProposee = matieresDisponibles.some(
      (o) => o.matiere.toLowerCase() === matiere.toLowerCase(),
    )
    if (dejaProposee) return
    if (libres.some((m) => m.toLowerCase() === matiere.toLowerCase())) return

    setLibres((l) => [...l, matiere])
  }

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

          {/* Primaire, université, formation professionnelle : la liste ne peut
              pas tout prévoir, et un adulte qui révise pour lui-même n'est dans
              aucune de ces classes. */}
          <ChampLibre
            etiquette={d.tuteur.autreClasse}
            exemple={d.tuteur.autreClassePlaceholder}
            suggestions={niveaux}
            identifiantListe="catalogue-niveaux"
            ajouterLibelle={d.tuteur.continuer}
            onAjouter={(v) => {
              setNiveau(v)
              setMatieres([])
              suivant()
            }}
          />
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
              <span className="flex items-center justify-between gap-2">
                <span>{d.matieres[o.matiere] ?? o.matiere}</span>
                {/* Le programme officiel est ce qui distingue ce tuteur d'un
                    robot bavard : quand il est là, on le dit. */}
                <span className="badge-verifie shrink-0 text-[10px]">
                  {d.tuteur.suitLeProgramme}
                  {paysEleve && o.pays !== paysEleve
                    ? ` · ${d.tuteur.pays[o.pays] ?? o.pays}`
                    : ""}
                </span>
              </span>
            </Choix>
          ))}

          {libres.map((m) => (
            <Choix key={m} actif onClick={() => setLibres((l) => l.filter((x) => x !== m))}>
              <span className="flex items-center justify-between gap-2">
                <span>{m}</span>
                <span className="doux shrink-0 text-[10px]">
                  {d.tuteur.sansProgramme}
                </span>
              </span>
            </Choix>
          ))}

          {/* La porte de secours. Elle vient APRÈS les matières officielles,
              pour que celles-ci restent le chemin normal. */}
          <ChampLibre
            etiquette={d.tuteur.autreMatiere}
            exemple={d.tuteur.autreMatierePlaceholder}
            suggestions={catalogue}
            identifiantListe="catalogue-matieres"
            ajouterLibelle={d.tuteur.ajouter}
            onAjouter={ajouterLibre}
          />

          <button
            type="button"
            disabled={matieres.length === 0 && libres.length === 0}
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
          {libres.map((m) => (
            <input key={m} type="hidden" name="matiereLibre" value={m} />
          ))}
          <input type="hidden" name="niveauLibre" value={niveau} />

          <textarea
            name="manuels"
            rows={3}
            placeholder={"CIAM Terminale D\nExcellence en maths Tle D"}
            className="champ px-3 py-2.5"
          />

          <div className="carte p-4 text-sm">
            <div className="font-medium">{d.tuteur.recapitulatif}</div>
            <div className="doux mt-1">
              {paysEleve ? `${d.tuteur.pays[paysEleve] ?? paysEleve} · ` : ""}
              {d.niveaux[niveau] ?? niveau}
            </div>
            <div className="doux">
              {[
                ...matieresDisponibles
                  .filter((o) => matieres.includes(o.id))
                  .map((o) => d.matieres[o.matiere] ?? o.matiere),
                ...libres,
              ].join(", ")}
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
