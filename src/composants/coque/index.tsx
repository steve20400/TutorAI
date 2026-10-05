import { Entete } from "./entete"
import type { Entree } from "./menu-compte"
import { chemin, dictionnaire, type Langue } from "@/langues"
import { api } from "@/lib/api"

export { ENCRE, ENCRE_TEXTE, ENCRE_DOUX } from "./entete"

type Profil = {
  prenom: string | null
  nom: string | null
  role: string
  photo_url: string | null
}

/**
 * La coque de l'application, posée en tête de chaque écran connecté.
 *
 * Elle lit le profil et les villes elle-même plutôt que de les recevoir : les
 * faire descendre depuis chaque page voulait dire les oublier sur une page
 * sur deux, et c'est exactement ce qui est arrivé — chaque écran avait fini
 * par bricoler son propre en-tête.
 *
 * Les entrées du menu dépendent du rôle. Un enfant n'a pas de messagerie :
 * c'est la promesse du produit, pas un oubli.
 */
export async function Coque({
  langue,
  villeActive,
  recherche,
}: {
  langue: Langue
  villeActive?: string
  recherche?: string
}) {
  const d = dictionnaire(langue)
  const t = d.coque

  let profil: Profil | null = null
  try {
    profil = await api<Profil>("/v1/moi")
  } catch {
    profil = null
  }

  let villes: string[] = []
  try {
    const r = await api<{ donnees: { nom: string }[] }>("/v1/villes", {
      sansSession: true,
    })
    villes = (r.donnees ?? []).map((v) => v.nom)
  } catch {
    villes = []
  }

  const role = profil?.role ?? "eleve"

  const entrees: Entree[] = [
    {
      href: chemin(langue, "/compte"),
      titre: t.monProfil,
      detail: t.monProfilDetail,
      icone: "profil",
    },
  ]

  if (role === "parent") {
    entrees.push({
      href: chemin(langue, "/parent"),
      titre: t.mesEnfants,
      detail: t.mesEnfantsDetail,
      icone: "enfants",
    })
    entrees.push({
      href: chemin(langue, "/messages"),
      titre: t.messages,
      detail: t.messagesDetail,
      icone: "messages",
    })
  }

  if (role === "repetiteur") {
    entrees.push({
      href: chemin(langue, "/repetiteur"),
      titre: t.monDossier,
      detail: t.monDossierDetail,
      icone: "enfants",
    })
    // L'annuaire lui était fermé par le menu, pas par la règle : la page
    // n'écarte que les élèves. Un répétiteur a toutes les raisons de lire les
    // autres dossiers — c'est ainsi qu'on voit à quoi ressemble un dossier
    // complet, et combien se pratique dans sa ville.
    entrees.push({
      href: chemin(langue, "/annuaire"),
      titre: t.annuaire,
      detail: t.annuaireDetail,
      icone: "annuaire",
    })
    entrees.push({
      href: chemin(langue, "/messages"),
      titre: t.messages,
      detail: t.messagesDetailRepetiteur,
      icone: "messages",
    })
  }

  // L'enfant n'a que son compte. Pas de messagerie : il ne doit jamais avoir
  // de canal écrit vers un adulte hors de la plateforme.

  // Les libellés de l'inscription — « Je suis adulte », « Je suis un
  // enfant » — sont écrits pour des boutons de choix. Dans un menu, sous un
  // prénom, ils sonnent faux : on y attend un rôle, pas une phrase.
  const roles: Record<string, string> = {
    parent: t.roleParent,
    repetiteur: t.roleRepetiteur,
    eleve: t.roleEleve,
  }

  return (
    <Entete
      prenom={profil?.prenom ?? null}
      nom={profil?.nom ?? null}
      photoUrl={profil?.photo_url ?? null}
      sousTitre={roles[role] ?? ""}
      entrees={entrees}
      villes={villes}
      villeActive={villeActive}
      recherche={recherche}
      chercher={role !== "eleve"}
      // Le logo ramène chez soi, et « chez soi » a changé : l'adulte ouvre sa
      // session sur l'annuaire, le répétiteur sur son dossier. Le logo menait
      // encore à « Mes enfants », c'est-à-dire ailleurs que là où la connexion
      // dépose — deux accueils pour une même personne.
      accueil={
        role === "parent" ? "/annuaire" : role === "repetiteur" ? "/repetiteur" : "/"
      }
      langue={langue}
      d={d}
    />
  )
}
