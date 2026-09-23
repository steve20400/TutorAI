"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
  type Dictionnaire,
  type Langue,
} from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatFormulaire = {
  erreur?: string
  info?: string
}


/**
 * Langue transmise par le formulaire.
 *
 * Chaque formulaire porte un champ caché `langue`. Sans lui, une action
 * serveur ne saurait ni dans quelle langue rédiger son message d'erreur, ni
 * vers quelle adresse rediriger — et renverrait un anglophone sur une page
 * française.
 */
function langueDe(donnees: FormData): Langue {
  const brut = String(donnees.get("langue") ?? "")
  return estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
}

/** Messages d'erreur Supabase traduits. Personne ne doit lire de l'anglais brut. */
function traduire(message: string, d: Dictionnaire, contact: string): string {
  const m = message.toLowerCase()
  // Un compte désactivé doit le savoir, et savoir où écrire. « Identifiants
  // incorrects » ferait ressaisir indéfiniment un mot de passe pourtant juste,
  // et un refus sans adresse de contact est une porte fermée sans sonnette.
  //
  // Le motif lui-même n'est PAS affiché ici : il faudrait le lire avant toute
  // authentification, donc le livrer à qui saisit un identifiant au hasard.
  // C'est par écrit qu'on le donne, à quelqu'un dont on sait qui il est.
  if (m.includes("banned")) {
    return remplir(d.erreurs.compteDesactive, { contact })
  }
  if (m.includes("invalid login credentials"))
    return d.erreurs.identifiantsIncorrects
  if (m.includes("email not confirmed")) return d.erreurs.emailNonConfirme
  if (m.includes("user already registered")) return d.erreurs.compteExistant
  if (m.includes("password should be at least")) return d.erreurs.motDePasseCourt
  if (m.includes("rate limit") || m.includes("too many"))
    return d.erreurs.tropDeTentatives
  return d.erreurs.generique
}

/**
 * Adresse à laquelle on conteste une décision.
 *
 * Lue en base et non codée ici : elle changera le jour où une vraie boîte de
 * contact existera, et il ne faudra pas redéployer pour ça. En cas de panne,
 * on retombe sur une chaîne vide plutôt que d'empêcher la connexion — le
 * message perd sa fin, la porte reste ouverte.
 */
async function contactAdministration(): Promise<string> {
  try {
    const { contact_administration } = await api<{
      contact_administration?: string
    }>("/v1/contact", { sansSession: true })
    return contact_administration ?? ""
  } catch {
    return ""
  }
}

export async function seConnecter(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const langue = langueDe(donnees)
  const d = dictionnaire(langue)

  const saisie = String(donnees.get("email") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")
  const suite = String(donnees.get("suite") ?? "")

  if (!saisie || !motDePasse) return { erreur: d.erreurs.champsVides }

  const supabase = await supabaseServeur()

  // L'administration se connecte par identifiant (« GALILEE »), les autres par
  // email. Une saisie sans arobase est donc traitée comme un identifiant et
  // résolue en base. Échec silencieux volontaire : si l'identifiant n'existe
  // pas, on laisse l'authentification répondre « identifiants incorrects »
  // plutôt que de révéler quels comptes existent.
  let email = saisie
  if (!saisie.includes("@")) {
    const { data } = await supabase.rpc("email_par_identifiant", { saisie })
    email = (data as string | null) ?? saisie
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  })

  if (error) return { erreur: traduire(error.message, d, await contactAdministration()) }

  revalidatePath("/", "layout")

  // On ne redirige que vers un chemin interne : une URL fournie par
  // l'utilisateur ne doit jamais servir à envoyer ailleurs.
  if (suite.startsWith("/") && !suite.startsWith("//")) {
    const accueil = chemin(langue, "/")
    if (suite !== accueil && suite !== "/") redirect(suite)
  }

  redirect(await accueilDeLUtilisateur(supabase, langue))
}

/** Rôles qu'un visiteur peut se donner lui-même. `admin` n'en fait pas partie. */
const ROLES_AUTORISES = ["eleve", "parent", "repetiteur"] as const
type RoleInscription = (typeof ROLES_AUTORISES)[number]

/** Où chaque rôle atterrit juste après son inscription. */
const ACCUEIL_PAR_ROLE: Record<RoleInscription, string> = {
  eleve: "/",
  parent: "/parent",
  repetiteur: "/repetiteur/profil",
}

/**
 * Accueil correspondant au rôle de l'utilisateur connecté.
 * Un répétiteur envoyé sur l'accueil élève verrait un espace qui ne le
 * concerne pas — et se demanderait s'il s'est trompé de compte.
 */
async function accueilDeLUtilisateur(
  supabase: Awaited<ReturnType<typeof supabaseServeur>>,
  langue: Langue,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return chemin(langue, "/")

  const { data } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = data?.role as RoleInscription | "admin" | undefined
  if (role === "admin") return chemin(langue, "/admin")
  if (role === "parent") return chemin(langue, "/parent")
  if (role === "repetiteur") return chemin(langue, "/repetiteur/profil")
  return chemin(langue, "/")
}

export async function sInscrire(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const langue = langueDe(donnees)
  const d = dictionnaire(langue)

  const prenom = String(donnees.get("prenom") ?? "").trim()
  const nom = String(donnees.get("nom") ?? "").trim()
  const telephone = String(donnees.get("telephone") ?? "").trim()
  const email = String(donnees.get("email") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")
  const roleBrut = String(donnees.get("role") ?? "")

  // Le rôle arrive du navigateur : il est vérifié contre une liste fermée.
  // Sans ce contrôle, un champ modifié à la main suffirait à se déclarer
  // administrateur — et `est_admin()` ouvre toutes les politiques RLS.
  if (!ROLES_AUTORISES.includes(roleBrut as RoleInscription)) {
    return { erreur: d.erreurs.roleManquant }
  }
  const role = roleBrut as RoleInscription

  if (!prenom) return { erreur: d.erreurs.prenomManquant }
  if (!email) return { erreur: d.erreurs.emailManquant }
  if (motDePasse.length < 8) return { erreur: d.erreurs.motDePasseTropCourt }

  const supabase = await supabaseServeur()

  // `data` alimente le déclencheur `sur_nouvel_utilisateur` du schéma, qui
  // crée la ligne dans `profils`. Les clés doivent correspondre exactement.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      data: {
        prenom,
        nom: nom || null,
        telephone: telephone || null,
        role,
        pays: process.env.NEXT_PUBLIC_PAYS_PAR_DEFAUT ?? "CM",
        langue,
      },
    },
  })

  if (error) return { erreur: traduire(error.message, d, await contactAdministration()) }

  // Si la confirmation par email est active dans Supabase, aucune session
  // n'est ouverte tout de suite.
  if (!data.session) {
    return { info: remplir(d.erreurs.compteCree, { email }) }
  }

  revalidatePath("/", "layout")
  redirect(chemin(langue, ACCUEIL_PAR_ROLE[role]))
}

export async function seDeconnecter(donnees: FormData): Promise<void> {
  const langue = langueDe(donnees)
  const supabase = await supabaseServeur()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect(chemin(langue, "/connexion"))
}
