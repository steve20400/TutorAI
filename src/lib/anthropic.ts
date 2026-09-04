import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { MemoireEleve, Message } from "@/types/db"
import { detaillerLecon, tableDesMatieres, trouverLecon } from "./programme"
import type { Lecon } from "@/types/db"

/**
 * Client construit à la demande, pas au chargement du module : le SDK lève
 * une erreur si ANTHROPIC_API_KEY est absente, ce qui ferait échouer le build.
 */
let client: Anthropic | null = null
function anthropic(): Anthropic {
  client ??= new Anthropic()
  return client
}

/**
 * Le modèle n'est JAMAIS entraîné. Il reçoit à chaque requête :
 *   1. le prompt système (les règles du tuteur)
 *   2. la table des matières du programme officiel
 *   3. le détail de la leçon du jour + la mémoire de l'élève
 *   4. le fil de la conversation
 * Puis il oublie. C'est l'application qui se souvient.
 */

const MODELE = "claude-opus-5"

/**
 * Bouton de réglage coût / qualité. `medium` est un point de départ :
 * fais une passe low / medium / high sur de vraies séances avant de figer.
 * Ne baisse pas au-dessous de `medium` sans mesurer — un tuteur qui juge mal
 * le palier de l'élève casse toute la pédagogie.
 */
const EFFORT = "medium" as const

/** Lu une seule fois, à la première séance. Source unique : src/data/prompt-tuteur.md */
let promptBrut: string | null = null
function promptBrutCharge(): string {
  promptBrut ??= readFileSync(
    join(process.cwd(), "src", "data", "prompt-tuteur.md"),
    "utf-8",
  )
  return promptBrut
}

type ContexteSeance = {
  prenomEleve: string
  niveau: string
  pays: string
  matiere: string
  mode: "texte" | "audio"
  programme: Record<string, unknown>
  memoire: MemoireEleve | null
  leconTitre: string | null
  historique: Pick<Message, "auteur" | "contenu">[]
  /** Texte extrait d'une photo du manuel. Éphémère : jamais persisté. */
  pageDuJour?: string
}

function promptSysteme(c: ContexteSeance): string {
  return promptBrutCharge().replaceAll("{{PRENOM_ELEVE}}", c.prenomEleve)
    .replaceAll("{{NIVEAU}}", c.niveau)
    .replaceAll("{{PAYS}}", c.pays)
    .replaceAll("{{MATIERE}}", c.matiere)
}

function contexteVolatil(c: ContexteSeance, lecon: Lecon | null): string {
  const blocs: string[] = []

  blocs.push(
    lecon
      ? `LECON_DU_JOUR :\n${detaillerLecon(lecon)}`
      : "LECON_DU_JOUR : non encore identifiée. Demande à l'élève de préciser ce qui a été fait en classe, puis retrouve la leçon dans la table des matières.",
  )

  if (c.memoire) {
    blocs.push(
      [
        "HISTORIQUE :",
        `Notions acquises : ${c.memoire.notions_acquises.join(" ; ") || "(aucune encore)"}`,
        `Notions fragiles : ${c.memoire.notions_fragiles.join(" ; ") || "(aucune encore)"}`,
        `Erreurs récurrentes : ${c.memoire.erreurs_recurrentes.join(" ; ") || "(aucune encore)"}`,
      ].join("\n"),
    )
  }

  // Éphémère par construction : présent dans la requête, absent de la base.
  if (c.pageDuJour) {
    blocs.push(
      `PAGE_DU_JOUR (photo du manuel, valable pour cette séance uniquement — reformule, ne recopie jamais) :\n${c.pageDuJour}`,
    )
  }

  blocs.push(`MODE : ${c.mode}`)

  return blocs.join("\n\n")
}

/** Une réplique du tuteur. */
export async function repondreCommeTuteur(c: ContexteSeance): Promise<string> {
  const dernierProposEleve =
    [...c.historique].reverse().find((m) => m.auteur === "eleve")?.contenu ?? ""

  const lecon =
    trouverLecon(c.programme, c.leconTitre ?? dernierProposEleve) ?? null

  const reponse = await anthropic().messages.create({
    model: MODELE,
    max_tokens: 8000,
    output_config: { effort: EFFORT },
    system: [
      { type: "text", text: promptSysteme(c) },
      {
        type: "text",
        text: `PROGRAMME OFFICIEL — ${c.niveau}, ${c.matiere}\n\n${tableDesMatieres(c.programme)}`,
        // Point de cache : tout ce qui précède est stable d'une requête à l'autre
        // et d'une séance à l'autre. ~90 % d'économie sur le préfixe.
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: contexteVolatil(c, lecon) },
    ],
    messages: c.historique.map((m) => ({
      role: m.auteur === "eleve" ? ("user" as const) : ("assistant" as const),
      content: m.contenu,
    })),
  })

  if (reponse.stop_reason === "refusal") {
    return "Je préfère ne pas répondre à ça. Revenons à ton programme : sur quelle leçon veux-tu travailler ?"
  }

  return reponse.content
    .filter((bloc) => bloc.type === "text")
    .map((bloc) => bloc.text)
    .join("\n")
    .trim()
}
