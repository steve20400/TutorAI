import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseServeur } from "@/lib/supabase/server"

export default async function PageTuteurs() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const { data: tuteurs } = await supabase
    .from("tuteurs_ia")
    .select("id, matiere, niveau, manuels")
    .eq("eleve_id", user.id)
    .order("cree_le", { ascending: true })

  if (!tuteurs || tuteurs.length === 0) redirect("/tuteur/nouveau")

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between pt-8">
        <h1 className="text-2xl font-medium">Mes tuteurs</h1>
        <Link
          href="/"
          className="text-sm opacity-60 underline underline-offset-4 hover:opacity-100"
        >
          Accueil
        </Link>
      </header>

      <ul className="flex flex-col gap-3">
        {tuteurs.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-black/10 p-5 dark:border-white/15"
          >
            <div className="font-medium">{t.matiere}</div>
            <div className="text-sm opacity-70">{t.niveau}</div>
            {Array.isArray(t.manuels) && t.manuels.length > 0 ? (
              <div className="mt-2 text-xs opacity-50">
                {(t.manuels as { titre: string }[])
                  .map((m) => m.titre)
                  .join(" · ")}
              </div>
            ) : null}

            {/* L'écran de séance est la prochaine étape — pas de lien mort ici. */}
            <div className="mt-3 text-xs uppercase tracking-wide opacity-40">
              Séance — bientôt
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/tuteur/nouveau"
        className="self-start text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        Ajouter une matière
      </Link>
    </main>
  )
}
