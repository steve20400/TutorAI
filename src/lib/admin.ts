import { redirect } from "next/navigation"

import { chemin, type Langue } from "@/langues"
import { api, ErreurApi } from "./api"
import { supabaseServeur } from "./supabase/server"

export type ProfilAdmin = {
  id: string
  role: string
  identifiant: string | null
  prenom: string | null
  photo_url: string | null
}

/**
 * Garde d'entrée de l'espace d'administration.
 *
 * C'est la deuxième des trois serrures. Le middleware garde la route, cette
 * fonction vérifie le rôle, et les politiques RLS protègent les données. Les
 * deux premières sont du code applicatif : on les contourne en appelant le
 * service directement, sans jamais passer par l'interface. Seule la troisième
 * tient dans tous les cas — d'où les tests dans supabase/tests/rls.sql.
 *
 * Le rôle est lu par `/v1/moi`, comme le reste : l'espace d'administration ne
 * parle plus à Postgres en direct. La session, elle, se lit toujours ici —
 * savoir si quelqu'un est connecté ne demande aucun aller-retour, et un
 * visiteur sans session n'a pas à réveiller un service endormi pour
 * l'apprendre.
 *
 * Un non-administrateur est renvoyé à l'accueil, pas à une page d'erreur :
 * répondre « interdit » confirmerait que l'adresse existe.
 */
export async function exigerAdmin(langue: Langue): Promise<ProfilAdmin> {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  let profil: ProfilAdmin
  try {
    profil = await api<ProfilAdmin>("/v1/moi")
  } catch (erreur) {
    // Une panne ne doit jamais élargir un droit : faute de pouvoir lire le
    // rôle, on n'ouvre pas l'espace. Mais le renvoi à l'accueil ne vaut que
    // pour un REFUS. Pour une panne passagère, il faisait pire que le mal.
    //
    // C'est le défaut que Steve a rencontré en apposant un cachet. Render
    // endort le service au bout de quinze minutes et le réveil prend une
    // cinquantaine de secondes. L'action réussissait ou non, puis la page se
    // redessinait ; `/v1/moi` tombait sur un service endormi ; cette ligne
    // renvoyait l'administrateur à la racine, qui interroge `/v1/moi` à son
    // tour et sans filet — et l'écran affichait « Cet écran n'a pas pu se
    // charger ». Un service qui bâille avait l'air d'une déconnexion.
    //
    // Une panne passagère remonte donc telle quelle : la frontière d'erreur
    // la reçoit, annonce l'attente et offre « Réessayer », en laissant
    // l'administrateur là où il est.
    if (erreur instanceof ErreurApi && erreur.statut !== 502 && erreur.statut !== 504) {
      redirect(chemin(langue, "/"))
    }
    throw erreur
  }

  if (profil.role !== "admin") redirect(chemin(langue, "/"))

  return profil
}
