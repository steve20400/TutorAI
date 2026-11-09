import Link from "next/link"
import { redirect } from "next/navigation"
import { BoutonAction } from "@/composants/bouton-action"
import { Coque } from "@/composants/coque"
import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"
import { terminerSeance } from "@/actions/seance"
import { Conversation } from "./conversation"

export default async function PageSeance({
  params,
}: {
  params: Promise<{ langue: string; seanceId: string }>
}) {
  const { langue: brut, seanceId } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const t = dictionnaire(langue).seance
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  // La RLS filtre : une séance qui n'est pas la sienne ne remonte pas.
  const { data: seance } = await supabase
    .from("seances")
    .select("id, statut, lecon_titre, tuteur:tuteurs_ia!inner (matiere, niveau)")
    .eq("id", seanceId)
    .single()

  if (!seance) redirect(chemin(langue, "/tuteur"))

  const tuteur = Array.isArray(seance.tuteur) ? seance.tuteur[0] : seance.tuteur

  const { data: messages } = await supabase
    .from("messages")
    .select("id, auteur, contenu")
    .eq("seance_id", seanceId)
    .order("id", { ascending: true })

  const terminee = seance.statut !== "en_cours"

  return (
    /*
     * Une séance est un écran immersif, comme la salle.
     *
     * Pas de `Coque` ici, et c'est délibéré : la barre de l'application porte
     * une recherche et un sélecteur de ville, qui n'ont rien à faire devant un
     * enfant au milieu d'une leçon, et elle prendrait de la hauteur à la seule
     * chose qui compte — le fil. La salle a tranché ainsi, et une séance avec
     * le tuteur et une séance avec un répétiteur sont le même geste pour
     * l'élève : deux en-têtes différents sur le même geste seraient
     * l'incohérence.
     *
     * `h-dvh` et non `min-h-dvh` : le fil défile DANS la page, et l'en-tête
     * comme le champ de saisie restent où ils sont. Sur un téléphone, un champ
     * de saisie qui s'en va quand on remonte lire une réponse oblige à
     * redescendre pour répondre.
     */
    <div className="flex h-dvh flex-col">
      {/* La barre de l'application, ici aussi.

          Elle n'y était pas : j'avais jugé qu'un écran immersif devait garder
          sa hauteur pour le fil. C'était un mauvais calcul — l'écran avait
          l'air d'une page orpheline, sans marque, sans sortie, sans compte, et
          un enfant qui veut quitter sa séance n'a que « Terminer », qui clôt
          la séance au lieu de le ramener. Les cent points qu'elle prend sont
          moins chers que ça. */}
      <Coque langue={langue} />

      <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4">
      {/* 44 px, comme la barre de la salle. */}
      <header
        className="flex h-11 shrink-0 items-center justify-between gap-3 border-b"
        style={{ borderColor: "var(--bordure)" }}
      >
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{tuteur.matiere}</div>
          <div className="doux truncate text-[11px]">
            {seance.lecon_titre ?? tuteur.niveau}
          </div>
        </div>

        {terminee ? (
          <Link
            href={chemin(langue, "/tuteur")}
            className="doux shrink-0 text-[12.5px] underline underline-offset-4"
          >
            {t.retour}
          </Link>
        ) : (
          <form action={terminerSeance} className="shrink-0">
            <input type="hidden" name="langue" value={langue} />
            <input type="hidden" name="seanceId" value={seance.id} />
            {/* Il clôt la séance — un geste qu'on ne défait pas — et il ne
                disait rien pendant qu'il partait. On recliquait. */}
            <BoutonAction className="doux text-[12.5px] underline underline-offset-4 transition hover:opacity-100">
              {t.terminer}
            </BoutonAction>
          </form>
        )}
      </header>

      {terminee ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4">
            {(messages ?? []).map((m) => (
              <div
                key={m.id}
                className={
                  m.auteur === "eleve"
                    ? "max-w-[85%] self-end rounded-2xl rounded-br-sm px-4 py-2.5"
                    : "max-w-[92%] self-start rounded-2xl rounded-bl-sm px-4 py-2.5"
                }
                style={
                  m.auteur === "eleve"
                    ? { background: "var(--accent)", color: "var(--accent-texte)" }
                    : {
                        background:
                          "color-mix(in srgb, var(--texte) 6%, var(--fond))",
                      }
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.contenu}
                </p>
              </div>
            ))}
          </div>
          <p className="doux mb-4 shrink-0 text-center text-[12.5px]">
            {t.terminee}
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
    </div>
  )
}
