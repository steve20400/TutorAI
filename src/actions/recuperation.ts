"use server"

import { chemin, dictionnaire, langueDeFormulaire } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"
import { origineDuSite } from "@/lib/origine"
import { api, ErreurApi } from "@/lib/api"
import { revalidatePath } from "next/cache"

export type EtatRecuperation = { erreur?: string; info?: string }

/**
 * Envoie un lien de réinitialisation.
 *
 * Réservé de fait aux adultes et aux répétiteurs : un enfant n'a pas
 * d'adresse, et c'est voulu — une adresse serait un canal vers lui qui ne
 * passe pas par la plateforme. Sa récupération à lui passera par celle de ses
 * parents, le jour où le courrier sera branché.
 *
 * La réponse est TOUJOURS la même, que le compte existe ou non. Dire « cette
 * adresse est inconnue » transformerait cet écran en vérificateur de comptes :
 * on saurait qui est inscrit chez TUTELA, et pour un produit qui accueille des
 * mineurs, c'est une information qu'on ne donne pas.
 */
export async function envoyerLeLien(
  _precedent: EtatRecuperation,
  donnees: FormData,
): Promise<EtatRecuperation> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.recuperation

  const email = String(donnees.get("email") ?? "").trim()
  if (!email.includes("@")) return { erreur: t.adresseAttendue }

  const supabase = await supabaseServeur()

  const origine = await origineDuSite()

  // Le lien passe par `/auth/confirm`, qui échange le jeton du courriel
  // contre une session avant de laisser entrer. Pointer directement sur la
  // page de saisie ouvrirait celle-ci à n'importe qui.
  const suite = chemin(langue, "/nouveau-mot-de-passe")
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origine}/auth/confirm?next=${encodeURIComponent(suite)}`,
  })

  // L'écran, lui, ne dira jamais rien de plus : le message est le même dans
  // tous les cas, et c'est ce qui empêche cet écran de devenir un annuaire
  // des inscrits.
  //
  // Mais nous, nous devons savoir. Supabase ne signale pas « ce compte
  // n'existe pas » — il répond succès dans ce cas. Une erreur ici veut donc
  // dire que l'envoi lui-même a échoué : SMTP refusé, quota dépassé, clé
  // périmée. Sans cette ligne, ces pannes-là sont invisibles jusqu'au jour
  // où un parent téléphone.
  //
  // L'adresse n'est pas journalisée : le journal n'a pas à devenir la liste
  // que l'écran refuse de donner.
  if (error) {
    console.error(
      "[recuperation] l'envoi du lien a échoué :",
      error.code ?? error.name,
      "—",
      error.message,
    )
  }

  return { info: t.envoye }
}

/**
 * Pose le nouveau mot de passe.
 *
 * Le lien du courriel ouvre une session éphémère ; c'est elle qui autorise
 * cette écriture. Sans elle, l'appel échoue — et c'est bien ce qu'on veut :
 * personne ne change un mot de passe sans avoir prouvé l'accès à la boîte.
 */
export async function poserLeMotDePasse(
  _precedent: EtatRecuperation,
  donnees: FormData,
): Promise<EtatRecuperation> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.recuperation

  const motDePasse = String(donnees.get("motDePasse") ?? "")
  if (motDePasse.length < 8) return { erreur: d.erreurs.motDePasseTropCourt }

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erreur: t.lienExpire }

  const { error } = await supabase.auth.updateUser({ password: motDePasse })
  if (error) {
    // Ici, contrairement à l'écran de demande, il n'y a rien à protéger : la
    // personne a prouvé l'accès à sa boîte, elle a le droit de savoir
    // pourquoi son mot de passe est refusé — trop court pour la politique du
    // projet, déjà utilisé, signalé comme divulgué.
    console.error(
      "[recuperation] mot de passe refusé :",
      error.code ?? error.name,
      "—",
      error.message,
    )
    return { erreur: t.echec }
  }

  // Supabase ne ferme pas les autres sessions quand le mot de passe change :
  // il faut le demander. Sans cela, la réinitialisation ne protège de rien —
  // or c'est souvent la raison même de la faire. Quelqu'un a pu ouvrir la
  // session d'un parent sur un téléphone prêté, un ordinateur de cybercafé,
  // un appareil resté chez un répétiteur. Changer le mot de passe le laissait
  // dedans, indéfiniment.
  //
  // `others` et non `global` : celle d'ici reste ouverte, sinon la personne
  // se retrouverait dehors juste après avoir prouvé qui elle est.
  const { error: erreurSessions } = await supabase.auth.signOut({
    scope: "others",
  })
  if (erreurSessions) {
    // On ne le dit pas à l'écran : le mot de passe, lui, a bien changé, et
    // annoncer un demi-échec ferait recommencer pour rien. Mais si cela
    // arrive, quelqu'un est peut-être encore dans le compte.
    console.error(
      "[recuperation] les autres sessions n'ont pas pu être fermées :",
      erreurSessions.message,
    )
  }

  return { info: t.change }
}

/**
 * L'enfant demande un nouveau mot de passe.
 *
 * Il donne son nom de connexion, pas une adresse : il n'en a pas. La demande
 * part chez tous ses adultes, par courriel et dans leur espace — la carte ne
 * dépend d'aucun service d'envoi, donc l'enfant n'est jamais bloqué par le
 * courrier.
 *
 * La réponse est toujours la même, compte existant ou non, adulte rattaché ou
 * non. Autrement ce champ dirait qui est inscrit chez TUTELA, et lesquels sont
 * seuls.
 */
export async function demanderPourUnEnfant(
  _precedent: EtatRecuperation,
  donnees: FormData,
): Promise<EtatRecuperation> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.recuperation

  const nom = String(donnees.get("nom") ?? "").trim()
  if (nom.length < 2) return { erreur: t.nomAttendu }

  try {
    await api("/v1/recuperation/enfant", {
      methode: "POST",
      corps: { nom },
      sansSession: true,
    })
  } catch {
    // Même en cas d'échec, même message : le silence est la protection.
  }

  return { info: t.enfantEnvoye }
}

/**
 * Un adulte pose le nouveau mot de passe de son enfant.
 *
 * La demande vaut dix minutes et ne sert qu'une fois — une demande qui traîne
 * est une porte ouverte : quiconque met la main sur le téléphone du parent
 * dans l'intervalle prend le compte de l'enfant.
 */
export async function poserPourSonEnfant(
  _precedent: EtatRecuperation,
  donnees: FormData,
): Promise<EtatRecuperation> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.recuperation

  const demande = String(donnees.get("demande") ?? "")
  const motDePasse = String(donnees.get("motDePasse") ?? "")

  if (!demande) return { erreur: t.echec }
  if (motDePasse.length < 6) return { erreur: t.enfantTropCourt }

  try {
    await api(`/v1/liens/mots-de-passe/${demande}`, {
      methode: "POST",
      corps: { motDePasse },
    })
  } catch (e: unknown) {
    return { erreur: e instanceof ErreurApi ? e.message : t.echec }
  }

  revalidatePath("/", "layout")
  return { info: t.enfantPose }
}

/**
 * Renvoie la demande, quand les dix minutes ont passé.
 *
 * La précédente se ferme à la seconde : deux demandes vivantes, ce serait deux
 * liens valables pour un seul besoin — et le plus ancien traînerait dans une
 * boîte de courriel longtemps après avoir été oublié.
 */
export async function renvoyerLaDemande(donnees: FormData): Promise<void> {
  const eleve = String(donnees.get("eleve") ?? "")
  if (!eleve) return

  try {
    await api(`/v1/liens/mots-de-passe/${eleve}/renvoyer`, { methode: "POST" })
  } catch {
    // Un échec laisse la demande en l'état : elle reste affichée, et le
    // bouton se represse.
  }

  revalidatePath("/", "layout")
}
