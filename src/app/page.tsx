import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseServeur } from "@/lib/supabase/server"
import { seDeconnecter } from "./(auth)/actions"

/**
 * Accueil élève — deux entrées, rien de plus (docs/SPEC_APPLICATION.md §2.1).
 * « Mes cours » n'apparaîtra qu'en v3, quand le parent aura activé les cours
 * à distance.
 *
 * Le middleware garde déjà cette route ; le contrôle ci-dessous est la
 * deuxième serrure, celle qui tient si la configuration du middleware change.
 */
export default async function Accueil() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

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

  const aUnTuteur = (tuteurs?.length ?? 0) > 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between pt-8">
        <div>
          <h1 className="text-2xl font-medium">
            Bonjour {profil?.prenom ?? ""} 👋
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Qu&apos;est-ce qu&apos;on fait aujourd&apos;hui ?
          </p>
        </div>

        <form action={seDeconnecter}>
          <button
            type="submit"
            className="text-sm opacity-60 underline underline-offset-4 hover:opacity-100"
          >
            Quitter
          </button>
        </form>
      </header>

      <div className="mt-4 flex flex-col gap-3">
        <Link
          href="/discuter"
          className="rounded-xl border border-black/10 p-5 transition hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.04]"
        >
          <div className="font-medium">Discuter</div>
          <div className="text-sm opacity-70">Poser une question libre</div>
        </Link>

        <Link
          href={aUnTuteur ? "/tuteur" : "/tuteur/nouveau"}
          className="rounded-xl border-2 border-amber-600/40 bg-amber-600/[0.06] p-5 transition hover:bg-amber-600/[0.12]"
        >
          <div className="font-medium">Mon tuteur</div>
          <div className="text-sm opacity-70">
            {aUnTuteur
              ? `${tuteurs![0].matiere} — ${tuteurs![0].niveau}`
              : "Créer ton tuteur en 4 étapes"}
          </div>
        </Link>
      </div>
    </main>
  )
}
