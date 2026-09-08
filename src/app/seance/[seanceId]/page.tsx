import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseServeur } from "@/lib/supabase/server"
import { terminerSeance } from "../actions"
import { Conversation } from "./conversation"

export default async function PageSeance({
  params,
}: {
  params: Promise<{ seanceId: string }>
}) {
  const { seanceId } = await params
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  // La RLS filtre : une séance qui n'est pas la sienne ne remonte pas.
  const { data: seance } = await supabase
    .from("seances")
    .select("id, statut, lecon_titre, tuteur:tuteurs_ia!inner (matiere, niveau)")
    .eq("id", seanceId)
    .single()

  if (!seance) redirect("/tuteur")

  const tuteur = Array.isArray(seance.tuteur) ? seance.tuteur[0] : seance.tuteur

  const { data: messages } = await supabase
    .from("messages")
    .select("id, auteur, contenu")
    .eq("seance_id", seanceId)
    .order("id", { ascending: true })

  const terminee = seance.statut !== "en_cours"

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col px-4">
      <header className="flex items-center justify-between border-b border-black/10 py-3 dark:border-white/10">
        <div>
          <div className="font-medium">{tuteur.matiere}</div>
          <div className="text-xs opacity-60">
            {seance.lecon_titre ?? tuteur.niveau}
          </div>
        </div>

        {terminee ? (
          <Link
            href="/tuteur"
            className="text-sm opacity-60 underline underline-offset-4"
          >
            Retour
          </Link>
        ) : (
          <form action={terminerSeance}>
            <input type="hidden" name="seanceId" value={seance.id} />
            <button
              type="submit"
              className="text-sm opacity-60 underline underline-offset-4 hover:opacity-100"
            >
              Terminer
            </button>
          </form>
        )}
      </header>

      {terminee ? (
        <>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
            {(messages ?? []).map((m) => (
              <div
                key={m.id}
                className={
                  m.auteur === "eleve"
                    ? "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-amber-700 px-4 py-2.5 text-white"
                    : "max-w-[90%] self-start rounded-2xl rounded-bl-sm bg-black/[0.05] px-4 py-2.5 dark:bg-white/[0.08]"
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.contenu}
                </p>
              </div>
            ))}
          </div>
          <p className="mb-4 text-center text-sm opacity-60">
            Séance terminée.
          </p>
        </>
      ) : (
        <Conversation
          seanceId={seance.id}
          messagesInitiaux={(messages ?? []).map((m) => ({
            id: String(m.id),
            auteur: m.auteur,
            contenu: m.contenu,
          }))}
        />
      )}
    </main>
  )
}
