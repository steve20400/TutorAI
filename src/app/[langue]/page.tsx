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
    .select("prenom")
    .eq("id", user.id)
    .single()

  const { data: tuteurs } = await supabase
    .from("tuteurs_ia")
    .select("id, matiere, niveau")
    .eq("eleve_id", user.id)
    .order("cree_le", { ascending: true })

  const premier = tuteurs?.[0]

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
        <Link href={chemin(langue, "/discuter")} className="choix-role">
          <span className="font-medium">{d.accueil.discuter}</span>
          <span className="doux mt-0.5 block text-sm">
            {d.accueil.discuterDetail}
          </span>
        </Link>

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
      </div>
    </main>
  )
}
