"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { chemin, langueDeFormulaire, type Langue } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatAdmin = { erreur?: string; info?: string }

/**
 * Vérifie que l'appelant est bien administrateur, et renvoie son identifiant.
 *
 * Appelée au début de CHAQUE action d'administration. La politique RLS
 * `est_admin()` protège déjà les écritures ; ce contrôle en plus permet de
 * répondre proprement plutôt que de laisser passer une écriture silencieuse
 * qui n'affecte aucune ligne.
 */
async function exigerAdmin(langue: Langue) {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "admin") redirect(chemin(langue, "/"))

  return { supabase, adminId: user.id }
}

/**
 * Journalise toute action d'administration. Sans exception.
 *
 * Le type de cible est un paramètre et non une constante : le registre doit
 * pouvoir dire « répétiteur 0041 » aussi bien que « paramètre ia_active ».
 * Le jour où une décision est contestée, c'est cette table qui répond.
 */
async function journaliser(
  supabase: Awaited<ReturnType<typeof supabaseServeur>>,
  adminId: string,
  action: string,
  cibleType: string,
  cibleId: string,
  motif?: string,
) {
  await supabase.from("journal_admin").insert({
    admin_id: adminId,
    action,
    cible_type: cibleType,
    cible_id: cibleId,
    motif: motif ?? null,
  })
}

const PARAMETRES_BOOLEENS = [
  "ia_active",
  "paiement_actif",
  "enregistrement_actif",
  "inscriptions_ouvertes",
] as const

/**
 * Modules qui exigent une clé enregistrée pour pouvoir s'allumer.
 *
 * Tant que la table des clés n'existe pas — elle viendra avec le module de
 * paiement — aucun d'eux ne peut être activé. C'est le comportement voulu :
 * un module allumé sans clé se contente d'échouer devant l'utilisateur.
 */
const CLES_REQUISES = new Set(["ia_active", "paiement_actif"])

export async function basculerParametre(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cle = String(donnees.get("cle") ?? "")
  const valeur = String(donnees.get("valeur") ?? "") === "true"

  if (!(PARAMETRES_BOOLEENS as readonly string[]).includes(cle)) return

  const { supabase, adminId } = await exigerAdmin(langue)

  // Certains modules ne peuvent pas fonctionner sans qu'une clé soit
  // enregistrée. L'interrupteur est grisé dans l'interface, mais un bouton
  // désactivé ne protège que l'interface : le refus doit être ici aussi.
  // Allumer le tuteur IA sans clé Anthropic afficherait aux élèves un écran
  // de création qui échouerait à la première question.
  if (valeur && CLES_REQUISES.has(cle)) {
    await journaliser(supabase, adminId, "activation_refusee_cle_manquante", "parametre", cle)
    return
  }

  await supabase
    .from("parametres")
    .update({ valeur, maj_le: new Date().toISOString(), maj_par: adminId })
    .eq("cle", cle)

  await journaliser(
    supabase,
    adminId,
    valeur ? "activation" : "desactivation",
    "parametre",
    cle,
  )

  revalidatePath("/", "layout")
}

const RESOLUTIONS = ["360p", "480p", "720p"] as const

export async function changerResolution(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const valeur = String(donnees.get("resolution") ?? "")
  if (!(RESOLUTIONS as readonly string[]).includes(valeur)) return

  const { supabase, adminId } = await exigerAdmin(langue)

  await supabase
    .from("parametres")
    .update({ valeur, maj_le: new Date().toISOString(), maj_par: adminId })
    .eq("cle", "resolution_video")

  await journaliser(supabase, adminId, "resolution", "parametre", valeur)
  revalidatePath("/admin")
}

/** Modes de facturation acceptés. Liste fermée : le reste est rejeté. */
const MODES = ["par_eleve_actif", "pourcentage_gains"] as const

/**
 * Enregistre les réglages de facturation.
 *
 * Basculer de mode n'efface rien : le montant fixe et le pourcentage sont deux
 * colonnes distinctes, et seule `mode` change. L'administrateur peut donc
 * revenir en arrière sans ressaisir ce qu'il avait réglé.
 *
 * Le changement ne s'applique qu'au cycle suivant : les redevances déjà
 * ouvertes ont figé leur tarif à leur création. Une facture ne se réécrit pas.
 */
export async function enregistrerFacturation(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const { supabase, adminId } = await exigerAdmin(langue)

  const modeBrut = String(donnees.get("mode") ?? "")
  const mode = (MODES as readonly string[]).includes(modeBrut)
    ? (modeBrut as (typeof MODES)[number])
    : "par_eleve_actif"

  const montant = Math.max(0, Number(donnees.get("montant") ?? 0) || 0)
  const delai = Math.max(0, Number(donnees.get("delai") ?? 15) || 0)

  // Le pourcentage exige que l'argent transite par la plateforme. Sans le
  // porte-monnaie, il n'y a aucun gain à observer : le refus est ici, pas
  // seulement dans l'interface qui grise le choix.
  const { data: portefeuille } = await supabase
    .from("parametres")
    .select("valeur")
    .eq("cle", "portefeuille_actif")
    .single()

  const modeRetenu =
    mode === "pourcentage_gains" && portefeuille?.valeur !== true
      ? "par_eleve_actif"
      : mode

  await supabase
    .from("facturation")
    .update({
      mode: modeRetenu,
      montant_par_eleve: montant,
      delai_masquage_jours: delai,
      maj_le: new Date().toISOString(),
      maj_par: adminId,
    })
    .eq("id", 1)

  await journaliser(
    supabase,
    adminId,
    "facturation",
    "parametre",
    modeRetenu,
    `${montant} FCFA · ${delai} j`,
  )

  revalidatePath("/", "layout")
}

/**
 * Appose le cachet sur un dossier.
 *
 * Le répétiteur devient visible des familles. C'est la décision qui engage le
 * produit, donc elle est journalisée sans exception et elle est la seule qui
 * puisse écrire `statut = 'verifie'` — le déclencheur
 * `sur_maj_repetiteur` l'interdit à tout le monde d'autre, y compris à
 * l'intéressé.
 */
export async function apposerCachet(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cible = String(donnees.get("repetiteurId") ?? "")
  if (!cible) return

  const { supabase, adminId } = await exigerAdmin(langue)

  await supabase
    .from("repetiteurs")
    .update({
      statut: "verifie",
      verifie_le: new Date().toISOString(),
      motif_refus: null,
      maj_le: new Date().toISOString(),
    })
    .eq("id", cible)

  await journaliser(supabase, adminId, "verification", "repetiteur", cible)
  revalidatePath("/", "layout")
  redirect(chemin(langue, "/admin/dossiers"))
}

/**
 * Refuse un dossier.
 *
 * Le motif est obligatoire : un refus sans explication est incompréhensible
 * pour celui qui le reçoit, et il ne lui dit pas quoi corriger.
 */
export async function refuserDossier(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cible = String(donnees.get("repetiteurId") ?? "")
  const motif = String(donnees.get("motif") ?? "").trim()
  if (!cible || !motif) return

  const { supabase, adminId } = await exigerAdmin(langue)

  await supabase
    .from("repetiteurs")
    .update({
      statut: "refuse",
      motif_refus: motif,
      maj_le: new Date().toISOString(),
    })
    .eq("id", cible)

  await journaliser(supabase, adminId, "refus", "repetiteur", cible, motif)
  revalidatePath("/", "layout")
  redirect(chemin(langue, "/admin/dossiers"))
}

/** Noms de clés acceptés. Une liste fermée : la valeur vient d'un formulaire. */
const CLES_CONNUES = [
  "carte_style",
  "carte_cle",
  "anthropic",
  "orange",
  "mtn",
] as const

/**
 * Pose une clé d'accès.
 *
 * L'écriture passe par `poser_cle` en base et non par un `update` direct :
 * c'est elle qui calcule l'aperçu au moment où la valeur est encore connue.
 * Le faire ici obligerait à relire `valeur` plus tard, ce que justement
 * personne ne doit pouvoir faire pour une clé secrète.
 */
export async function poserCle(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const nom = String(donnees.get("nom") ?? "")
  const valeur = String(donnees.get("valeur") ?? "").trim()

  if (!(CLES_CONNUES as readonly string[]).includes(nom)) return

  const { supabase, adminId } = await exigerAdmin(langue)

  const { error } = await supabase.rpc("poser_cle", {
    nom_cle: nom,
    nouvelle_valeur: valeur,
  })
  if (error) return

  // La valeur n'entre pas au registre : un journal qui recopie les clés qu'on
  // vient de poser est un second endroit où elles traînent.
  await journaliser(
    supabase,
    adminId,
    valeur ? "activation" : "desactivation",
    "cle",
    nom,
  )

  revalidatePath("/", "layout")
}
