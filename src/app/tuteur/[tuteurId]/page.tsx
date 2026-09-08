import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseServeur } from "@/lib/supabase/server"
import { demarrerSeance } from "@/app/seance/actions"

export default async function PageTuteur({
  params,
}: {
  params: Promise<{ tuteurId: string }>
}) {
  const { tuteurId } = await params
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const { data: tuteur } = await supabase
    .from("tuteurs_ia")
    .select("id, matiere, niveau")
    .eq("id", tuteurId)
    .single()

  if (!tuteur) redirect("/tuteur")

  const { data: seances } = await supabase
    .from("seances")
    .select("id, statut, lecon_titre, demarree_le")
    .eq("tuteur_id", tuteur.id)
    .order("demarree_le", { ascending: false })
    .limit(20)

  const enCours = seances?.find((s) => s.statut === "en_cours")

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-baseline justify-between pt-8">
        <div>
          <h1 className="text-2xl font-medium">{tuteur.matiere}</h1>
          <p className="text-sm opacity-70">{tuteur.niveau}</p>
        </div>
        <Link
          href="/tuteur"
          className="text-sm opacity-60 underline underline-offset-4 hover:opacity-100"
        >
          Retour
        </Link>
      </header>

      {enCours ? (
        <Link
          href={`/seance/${enCours.id}`}
          className="rounded-xl border-2 border-amber-600/40 bg-amber-600/[0.06] p-5 transition hover:bg-amber-600/[0.12]"
        >
          <div className="font-medium">Reprendre la séance en cours</div>
          <div className="text-sm opacity-70">
            {enCours.lecon_titre ?? "Leçon pas encore identifiée"}
          </div>
        </Link>
      ) : (
        <form action={demarrerSeance}>
          <input type="hidden" name="tuteurId" value={tuteur.id} />
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-700 px-4 py-4 font-medium text-white transition hover:bg-amber-800"
          >
            Commencer une séance
          </button>
        </form>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-50">
          Séances passées
        </h2>

        {(seances ?? []).filter((s) => s.statut !== "en_cours").length === 0 ? (
          <p className="text-sm opacity-60">
            Aucune séance pour l&apos;instant. Ton tuteur t&apos;attend.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(seances ?? [])
              .filter((s) => s.statut !== "en_cours")
              .map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/seance/${s.id}`}
                    className="block rounded-lg border border-black/10 px-4 py-3 transition hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.04]"
                  >
                    <div className="text-sm">
                      {s.lecon_titre ?? "Leçon non identifiée"}
                    </div>
                    <div className="text-xs opacity-50">
                      {new Date(s.demarree_le).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  )
}
