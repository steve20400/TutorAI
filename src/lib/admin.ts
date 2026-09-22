import { redirect } from "next/navigation"

import { chemin, type Langue } from "@/langues"
import { supabaseServeur } from "./supabase/server"

/**
 * Garde d'entrée de l'espace d'administration.
 *
 * C'est la deuxième des trois serrures. Le middleware garde la route, cette
 * fonction vérifie le rôle, et les politiques RLS protègent les données. Les
 * deux premières sont du code applicatif : on les contourne en appelant l'API
 * directement, sans jamais passer par l'interface. Seule la troisième tient
 * dans tous les cas — d'où les tests dans supabase/tests/rls.sql.
 *
 * Un non-administrateur est renvoyé à l'accueil, pas à une page d'erreur :
 * répondre « interdit » confirmerait que l'adresse existe.
 */
export async function exigerAdmin(langue: Langue) {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  const { data: profil } = await supabase
    .from("profils")
    .select("role, identifiant, prenom")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "admin") redirect(chemin(langue, "/"))

  return { supabase, profil, adminId: user.id }
}
