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
  redirect(suite.startsWith("/") ? suite : "/")
}

export async function sInscrire(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const prenom = String(donnees.get("prenom") ?? "").trim()
  const email = String(donnees.get("email") ?? "").trim()
  const motDePasse = String(donnees.get("motDePasse") ?? "")

  if (!prenom) return { erreur: "Dis-moi ton prénom." }
  if (!email) return { erreur: "Il me faut ton email." }
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
        role: "eleve",
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
  redirect("/")
}

export async function seDeconnecter(): Promise<void> {
  const supabase = await supabaseServeur()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/connexion")
}
