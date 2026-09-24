"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { chemin, langueDeFormulaire, type Langue } from "@/langues"
import { api, ErreurApi } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatAdmin = { erreur?: string; info?: string }

/**
 * Vérifie qu'une session existe avant d'appeler le service.
 *
 * Le rôle, lui, n'est plus contrôlé ici : les routes `/v1/admin/*` répondent
 * 403 à quiconque n'est pas administrateur, et cette garde-là ne se contourne
 * pas en appelant le service directement. Refaire le contrôle de ce côté
 * coûterait un aller-retour de plus pour protéger ce qui l'est déjà.
 *
 * Reste la session, qui se lit sans requête : un visiteur sans jeton n'a pas à
 * réveiller un service endormi pour se faire renvoyer à la connexion.
 */
async function exigerSession(langue: Langue): Promise<void> {
  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))
}

/**
 * Appelle le service et ramène la page à jour.
 *
 * Les échecs ne sont pas remontés à l'écran : ces actions sont des `<form>`
 * sans état, et le seul retour utile est ce que la page réaffiche. Un refus du
 * service — clé manquante, porte-monnaie éteint — laisse donc la valeur
 * inchangée, ce que l'interrupteur montre en revenant à sa position.
 */
/** Vit le temps d'un rechargement, puis disparaît tout seul. */
const SIGNALEMENT = "tutela_probleme"

/**
 * Appelle l'API et, en cas d'échec, le DIT.
 *
 * Cette fonction avalait toute erreur de l'API sans un mot. La page se
 * rechargeait identique, et un écran qui ne change pas se lit comme « il n'y
 * avait rien à faire », jamais comme « refusé ». C'est ainsi qu'« Apposer le
 * cachet » a pu ne rien faire pendant des semaines sans que personne ne le
 * remarque.
 *
 * Le message part dans un témoin de courte durée plutôt que dans une valeur
 * de retour : ces actions sont branchées sur des `<form action={…}>` nus, qui
 * ne reçoivent rien en retour. Le témoin est lu une fois par la coquille de
 * l'administration, et expire de lui-même.
 */
async function agir(chemin_: string, corps?: unknown): Promise<void> {
  try {
    await api(chemin_, { methode: "POST", corps })
  } catch (erreur) {
    if (!(erreur instanceof ErreurApi)) throw erreur

    const boite = await cookies()
    boite.set(SIGNALEMENT, erreur.message, {
      path: "/",
      maxAge: 15,
      httpOnly: false,
      sameSite: "lax",
    })
  }
  revalidatePath("/", "layout")
}

/** Réglages booléens. Liste fermée : ce qui vient d'un formulaire est filtré. */
const PARAMETRES_BOOLEENS = [
  "ia_active",
  "paiement_actif",
  "enregistrement_actif",
  "portefeuille_actif",
  "inscriptions_ouvertes",
] as const

export async function basculerParametre(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cle = String(donnees.get("cle") ?? "")
  const valeur = String(donnees.get("valeur") ?? "") === "true"

  if (!(PARAMETRES_BOOLEENS as readonly string[]).includes(cle)) return

  await exigerSession(langue)
  // Le refus d'allumer un module sans sa clé est dans le service : c'est lui
  // qui sait quelles clés sont posées, et lui seul répond aussi à l'appel
  // direct de la route.
  await agir(`/v1/admin/parametres/${cle}`, { valeur })
}

const RESOLUTIONS = ["360p", "480p", "720p"] as const

export async function changerResolution(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const valeur = String(donnees.get("resolution") ?? "")
  if (!(RESOLUTIONS as readonly string[]).includes(valeur)) return

  await exigerSession(langue)
  await agir("/v1/admin/parametres/resolution_video", { valeur })
}

/**
 * Choisit d'où vient le tuteur.
 *
 * Changer de fournisseur ne change rien d'autre : le contexte, le programme
 * et la mémoire de l'élève sont les mêmes pour les trois. Seule la clé exigée
 * pour allumer le module change avec lui.
 */
export async function changerFournisseur(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const valeur = String(donnees.get("fournisseur") ?? "")
  // Pas de liste ici : le service refuse déjà un nom qu'aucun de ses
  // adaptateurs ne sait servir, et lui seul sait lesquels il a.
  if (!valeur) return

  await exigerSession(langue)
  await agir("/v1/admin/parametres/ia_fournisseur", { valeur })
}

const MODES = ["par_eleve_actif", "pourcentage_gains"] as const

/**
 * Enregistre les réglages de facturation.
 *
 * Basculer de mode n'efface rien : le montant fixe et le pourcentage sont deux
 * colonnes distinctes, et seule `mode` change. On peut donc revenir en arrière
 * sans ressaisir ce qu'on avait réglé.
 *
 * Le changement ne s'applique qu'au cycle suivant : les redevances déjà
 * ouvertes ont figé leur tarif à leur création. Une facture ne se réécrit pas.
 */
export async function enregistrerFacturation(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  await exigerSession(langue)

  const modeBrut = String(donnees.get("mode") ?? "")
  const mode = (MODES as readonly string[]).includes(modeBrut)
    ? modeBrut
    : "par_eleve_actif"

  await agir("/v1/admin/facturation", {
    mode,
    montant_par_eleve: Math.max(0, Number(donnees.get("montant") ?? 0) || 0),
    delai_masquage_jours: Math.max(0, Number(donnees.get("delai") ?? 15) || 0),
  })
}

/**
 * Appose le cachet sur un dossier.
 *
 * Le répétiteur devient visible des familles. C'est la décision qui engage le
 * produit : elle est journalisée sans exception, et elle est la seule qui
 * puisse écrire `statut = 'verifie'` — le déclencheur `sur_maj_repetiteur`
 * l'interdit à tout le monde d'autre, y compris à l'intéressé.
 */
export async function apposerCachet(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cible = String(donnees.get("repetiteurId") ?? "")
  if (!cible) return

  await exigerSession(langue)
  await agir(`/v1/admin/dossiers/${cible}/cachet`)
}

/**
 * Refuse un dossier. Le motif est obligatoire.
 *
 * Un refus sans motif ne se conteste pas, et le répétiteur ne peut rien
 * corriger : il resterait devant une porte close sans savoir laquelle pousser.
 */
export async function refuserDossier(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cible = String(donnees.get("repetiteurId") ?? "")
  const motif = String(donnees.get("motif") ?? "").trim()
  if (!cible || !motif) return

  await exigerSession(langue)
  await agir(`/v1/admin/dossiers/${cible}/refus`, { motif })
}



/**
 * Pose une clé d'accès.
 *
 * La valeur ne repasse jamais par ici en lecture : `poser_cle` calcule son
 * aperçu au moment de l'écriture, quand elle est encore connue, et personne ne
 * la relit ensuite.
 */
export async function poserCle(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const nom = String(donnees.get("nom") ?? "")
  const valeur = String(donnees.get("valeur") ?? "").trim()
  // Aucune liste ici. `poser_cle` refuse déjà un nom qui n'existe pas dans
  // `cles_api`, et c'est la seule autorité légitime : une liste recopiée dans
  // le code ne protégeait de rien, elle empêchait la base de parler. C'est
  // elle qui avait fait disparaître la clé Gemini en silence.
  if (!nom) return

  await exigerSession(langue)
  await agir(`/v1/admin/cles/${nom}`, { valeur })
}

/**
 * Désactive un compte. Jamais de suppression.
 *
 * Supprimer effacerait ce qui permet de comprendre plus tard : qui a vérifié
 * ce répétiteur, quelles séances il a données, ce qu'un parent avait signalé.
 * Sur un produit dont la promesse est qu'une trace subsiste, effacer l'auteur
 * d'une séance reviendrait à effacer la séance.
 */
export async function desactiverCompte(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cible = String(donnees.get("compteId") ?? "")
  const motif = String(donnees.get("motif") ?? "").trim()
  if (!cible) return

  await exigerSession(langue)
  await agir(`/v1/admin/comptes/${cible}/desactivation`, { motif })
}

export async function reactiverCompte(donnees: FormData): Promise<void> {
  const langue = langueDeFormulaire(donnees)
  const cible = String(donnees.get("compteId") ?? "")
  if (!cible) return

  await exigerSession(langue)
  await agir(`/v1/admin/comptes/${cible}/reactivation`)
}
