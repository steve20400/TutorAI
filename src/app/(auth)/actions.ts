"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabaseServeur } from "@/lib/supabase/server"

export type EtatFormulaire = {
  erreur?: string
  info?: string
}

/** Messages d'erreur Supabase traduits. L'élève ne doit jamais lire d'anglais. */
function traduire(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials"))
    return "Email ou mot de passe incorrect."
  if (m.includes("email not confirmed"))
    return "Ton email n'est pas encore confirmé. Vérifie ta boîte de réception."
  if (m.includes("user already registered"))
    return "Un compte existe déjà avec cet email. Connecte-toi."
  if (m.includes("password should be at least"))
    return "Le mot de passe est trop court."
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives. Réessaie dans quelques minutes."
  return "Une erreur est survenue. Réessaie."
}

export async function seConnecter(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = String(donnees.get("email") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")
  const suite = String(donnees.get("suite") ?? "/")

  if (!email || !motDePasse) {
    return { erreur: "Remplis les deux champs." }
  }

  const supabase = await supabaseServeur()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  })

  if (error) return { erreur: traduire(error.message) }

  revalidatePath("/", "layout")

  // On ne redirige que vers un chemin interne : une URL fournie par
  // l'utilisateur ne doit jamais servir à envoyer ailleurs.
  if (suite.startsWith("/") && suite !== "/") redirect(suite)

  redirect(await accueilDeLUtilisateur(supabase))
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
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return "/"

  const { data } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = data?.role as RoleInscription | "admin" | undefined
  if (role === "parent") return "/parent"
  if (role === "repetiteur") return "/repetiteur/profil"
  return "/"
}

export async function sInscrire(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
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
    return { erreur: "Choisis d'abord si tu es élève, parent ou répétiteur." }
  }
  const role = roleBrut as RoleInscription

  if (!prenom) return { erreur: "Il me faut un prénom." }
  if (!email) return { erreur: "Il me faut un email." }
  if (motDePasse.length < 8) {
    return { erreur: "Le mot de passe doit faire au moins 8 caractères." }
  }

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
      },
    },
  })

  if (error) return { erreur: traduire(error.message) }

  // Si la confirmation par email est active dans Supabase, aucune session
  // n'est ouverte tout de suite.
  if (!data.session) {
    return {
      info: `Compte créé. Ouvre l'email envoyé à ${email} pour confirmer, puis connecte-toi.`,
    }
  }

  revalidatePath("/", "layout")
  redirect(ACCUEIL_PAR_ROLE[role])
}

export async function seDeconnecter(): Promise<void> {
  const supabase = await supabaseServeur()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/connexion")
}
