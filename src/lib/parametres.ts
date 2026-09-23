import { redirect } from "next/navigation"

import { chemin, type Langue } from "@/langues"
import { api } from "./api"

/**
 * Paramètres réglables depuis l'espace d'administration, sans redéploiement.
 *
 * Les modules coûteux naissent ÉTEINTS : le tuteur IA consomme des crédits
 * Anthropic, l'enregistrement consomme du stockage, le paiement engage de
 * l'argent réel. Aucun ne doit s'allumer tout seul.
 */
export type Parametres = {
  ia_active: boolean
  paiement_actif: boolean
  enregistrement_actif: boolean
  portefeuille_actif: boolean
  resolution_video: "360p" | "480p" | "720p"
  inscriptions_ouvertes: boolean
  /**
   * Deux par défaut : l'élève et son répétiteur. C'est la promesse du produit,
   * donc le comportement par défaut — pas une option à cocher.
   */
  participants_max: number
  /**
   * D'où vient le tuteur. Personne, côté élève, ne voit jamais ce nom — ce
   * qui est précisément ce qui permet d'en changer sans que quiconque s'en
   * aperçoive.
   */
  ia_fournisseur: "anthropic" | "gemini" | "compatible"
}

const DEFAUTS: Parametres = {
  ia_active: false,
  paiement_actif: false,
  enregistrement_actif: false,
  portefeuille_actif: false,
  resolution_video: "480p",
  inscriptions_ouvertes: true,
  participants_max: 2,
  ia_fournisseur: "anthropic",
}

/**
 * Lit les paramètres. En cas d'échec — base injoignable, table absente — on
 * retombe sur les défauts, qui sont tous à « éteint ». Une panne ne doit
 * jamais allumer un module payant.
 */
export async function lireParametres(): Promise<Parametres> {
  try {
    const lus = await api<Partial<Parametres>>("/v1/parametres", {
      sansSession: true,
    })
    return { ...DEFAUTS, ...lus }
  } catch {
    return DEFAUTS
  }
}

/**
 * Garde-fou côté serveur.
 *
 * Masquer un bouton n'empêche personne d'appeler la route qui se trouve
 * derrière. Toute action appartenant à un module désactivable doit passer
 * par ici, pas seulement l'écran qui y mène.
 */
type Interrupteur = {
  [C in keyof Parametres]: Parametres[C] extends boolean ? C : never
}[keyof Parametres]

export async function exigerModuleActif(module: Interrupteur): Promise<void> {
  const parametres = await lireParametres()
  if (parametres[module] !== true) {
    throw new Error(`Module désactivé : ${module}`)
  }
}

/**
 * Nombre de participants encore admis dans une séance.
 *
 * À appeler au moment de délivrer le jeton d'accès à la salle, jamais
 * seulement à l'affichage : refuser un troisième participant dans l'interface
 * n'empêcherait personne d'appeler la route qui se trouve derrière.
 */
export async function placeDisponible(dejaPresents: number): Promise<boolean> {
  const { participants_max } = await lireParametres()
  return dejaPresents < participants_max
}

/**
 * Garde d'une PAGE appartenant à un module désactivable.
 *
 * `exigerModuleActif` lève, ce qui convient à une action serveur mais produit
 * un écran d'erreur pour quelqu'un qui a simplement suivi un vieux lien. Ici
 * on renvoie à l'accueil, sans expliquer : la page n'existe pas pour cette
 * personne aujourd'hui, et détailler pourquoi reviendrait à annoncer ce que
 * la plateforme prépare.
 *
 * À placer en TÊTE de chaque page concernée. Le middleware ne peut pas s'en
 * charger : il ne lit pas la base, et rendre les modules dépendants d'une
 * requête à chaque navigation coûterait cher pour un réglage qui bouge deux
 * fois par an.
 */
export async function exigerModulePage(
  module: Interrupteur,
  langue: Langue,
): Promise<void> {
  const parametres = await lireParametres()
  if (parametres[module] !== true) redirect(chemin(langue, "/"))
}
