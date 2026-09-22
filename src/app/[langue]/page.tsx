import Link from "next/link"
import { redirect } from "next/navigation"

import { BoutonDeconnexion } from "@/composants/deconnexion"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
} from "@/langues"
import { lireParametres } from "@/lib/parametres"
import { supabaseServeur } from "@/lib/supabase/server"

/**
 * Accueil élève — deux entrées, rien de plus (docs/SPEC_APPLICATION.md §2.1).
 * « Mes cours » n'apparaîtra qu'en v3, quand le parent aura activé les cours
 * à distance.
 *
 * Le middleware garde déjà cette route ; le contrôle ci-dessous est la
 * deuxième serrure, celle qui tient si la configuration du middleware change.
 */
export default async function Accueil({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Un visiteur sans session n'a pas forcément de compte. L'envoyer sur la
  // connexion suppose qu'il en a un : pour quelqu'un qui découvre TUTELA par
  // un lien partagé dans un groupe, c'est une porte fermée en guise d'accueil.
  // Celui qui a déjà un compte traverse l'inscription d'un clic ; celui qui
  // n'en a pas n'aurait pas trouvé son chemin.
  if (!user) redirect(chemin(langue, "/inscription"))

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom, role")
    .eq("id", user.id)
    .single()

  // Chaque rôle a son chez-soi, et la racine n'est celui que de l'élève.
  //
  // L'aiguillage existait déjà, mais seulement au moment de la connexion : un
  // répétiteur qui revenait sur l'adresse racine — depuis un favori, un lien
  // partagé, ou simplement en effaçant la fin de l'adresse — tombait sur
  // l'accueil élève, avec un message qui ne le concernait pas : « ton espace
  // s'ouvrira quand un parent t'aura rattaché à son compte ».
  if (profil?.role === "admin") redirect(chemin(langue, "/admin"))
  if (profil?.role === "parent") redirect(chemin(langue, "/parent"))
  if (profil?.role === "repetiteur") redirect(chemin(langue, "/repetiteur/profil"))

  const { data: tuteurs } = await supabase
    .from("tuteurs_ia")
    .select("id, matiere, niveau")
    .eq("eleve_id", user.id)
    .order("cree_le", { ascending: true })

  const premier = tuteurs?.[0]

  // Les entrées du tuteur IA ne s'affichent que si le module est allumé. Les
  // routes derrière refusent déjà, mais proposer un lien qui renvoie à la page
  // qu'on vient de quitter donne l'impression d'une application cassée — et
  // c'est bien ainsi qu'un élève l'a lu : « ça me met un écran pour créer le
  // tuteur », alors qu'il n'aurait jamais dû voir l'entrée.
  const { ia_active } = await lireParametres()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between pt-8">
        <div>
          <h1 className="text-2xl font-medium">
            {remplir(d.accueil.bonjour, { prenom: profil?.prenom ?? "" })}
          </h1>
          <p className="doux mt-1 text-sm">{d.accueil.question}</p>
        </div>

        <BoutonDeconnexion langue={langue} libelle={d.commun.quitter} />
      </header>

      <div className="mt-4 flex flex-col gap-3">
        {ia_active ? (
          <Link
            href={chemin(langue, premier ? "/tuteur" : "/tuteur/nouveau")}
            className="choix-role"
          >
            <span className="font-medium">{d.accueil.monTuteur}</span>
            <span className="doux mt-0.5 block text-sm">
              {premier
                ? `${premier.matiere} — ${premier.niveau}`
                : d.accueil.creerTuteur}
            </span>
          </Link>
        ) : (
          <div className="carte p-5">
            <p className="font-medium">{d.accueil.enAttente}</p>
            <p className="doux mt-1 text-sm leading-relaxed">
              {d.accueil.enAttenteDetail}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
