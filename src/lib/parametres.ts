import { supabaseServeur } from "./supabase/server"

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
  resolution_video: "360p" | "480p" | "720p"
  inscriptions_ouvertes: boolean
}

const DEFAUTS: Parametres = {
  ia_active: false,
  paiement_actif: false,
  enregistrement_actif: false,
  resolution_video: "480p",
  inscriptions_ouvertes: true,
}

/**
 * Lit les paramètres. En cas d'échec — base injoignable, table absente — on
 * retombe sur les défauts, qui sont tous à « éteint ». Une panne ne doit
 * jamais allumer un module payant.
 */
export async function lireParametres(): Promise<Parametres> {
  try {
    const supabase = await supabaseServeur()
    const { data } = await supabase.from("parametres").select("cle, valeur")

    if (!data) return DEFAUTS

    const lus = Object.fromEntries(data.map((p) => [p.cle, p.valeur]))
    return { ...DEFAUTS, ...lus } as Parametres
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
export async function exigerModuleActif(
  module: keyof Parametres,
): Promise<void> {
  const parametres = await lireParametres()
  if (parametres[module] !== true) {
    throw new Error(`Module désactivé : ${module}`)
  }
}
