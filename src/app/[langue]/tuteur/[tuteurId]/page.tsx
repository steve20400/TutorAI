import Link from "next/link"
import { redirect } from "next/navigation"

import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerModulePage } from "@/lib/parametres"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { demarrerSeance } from "@/actions/seance"

export default async function PageTuteur({
  params,
}: {
  params: Promise<{ langue: string; tuteurId: string }>
}) {
  const { langue: brut, tuteurId } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT

  // Le tuteur IA est un module qu'on allume depuis l'administration. Tant
  // qu'il est éteint, cette page n'existe pas — le middleware ne peut pas le
  // savoir, il ne lit pas la base.
  await exigerModulePage("ia_active", langue)
  const d = dictionnaire(langue)

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  let reponse: {
    tuteur: { id: string; matiere: string; niveau: string } | null
    seances: {
      id: string
      statut: string
      lecon_titre: string | null
      demarree_le: string | null
    }[]
  } | null = null
  try {
    reponse = await api(`/v1/tuteurs/${tuteurId}`)
  } catch {
    reponse = null
  }

  const tuteur = reponse?.tuteur ?? null
  const seances = reponse?.seances ?? []

  // Tuteur inconnu, ou service muet : on repart de la liste plutôt que
  // d'afficher un écran à moitié rempli.
  if (!tuteur) redirect(chemin(langue, "/tuteur"))

  const enCours = seances?.find((s) => s.statut === "en_cours")
  const passees = (seances ?? []).filter((s) => s.statut !== "en_cours")

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="flex items-baseline justify-between pt-8">
        <div>
          <h1 className="text-2xl font-medium">
            {d.matieres[tuteur.matiere] ?? tuteur.matiere}
          </h1>
          <p className="doux text-sm">
            {d.niveaux[tuteur.niveau] ?? tuteur.niveau}
          </p>
        </div>
        <Link
          href={chemin(langue, "/tuteur")}
          className="doux text-sm underline underline-offset-4"
        >
          {d.tuteur.retour}
        </Link>
      </header>

      {enCours ? (
        <Link href={chemin(langue, `/seance/${enCours.id}`)} className="choix-role">
          <span className="font-medium">{d.tuteur.reprendre}</span>
          <span className="doux mt-0.5 block text-sm">
            {enCours.lecon_titre ?? d.tuteur.leconNonIdentifiee}
          </span>
        </Link>
      ) : (
        <form action={demarrerSeance}>
          <input type="hidden" name="tuteurId" value={tuteur.id} />
          <input type="hidden" name="langue" value={langue} />
          <button type="submit" className="bouton w-full px-4 py-4">
            {d.tuteur.commencer}
          </button>
        </form>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="doux text-sm font-medium uppercase tracking-wide">
          {d.tuteur.seancesPassees}
        </h2>

        {passees.length === 0 ? (
          <p className="doux text-sm">{d.tuteur.aucuneSeance}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {passees.map((s) => (
              <li key={s.id}>
                <Link
                  href={chemin(langue, `/seance/${s.id}`)}
                  className="choix-role block"
                >
                  <span className="text-sm">
                    {s.lecon_titre ?? d.tuteur.leconNonIdentifiee}
                  </span>
                  {/* La date suit la langue de la page : « 4 mars » en
                      français, « 4 March » en anglais. Une séance créée mais
                      jamais démarrée n'en a pas — on n'affiche alors rien
                      plutôt que le 1er janvier 1970. */}
                  {s.demarree_le ? (
                    <span className="doux mt-0.5 block text-xs">
                      {new Date(s.demarree_le).toLocaleDateString(langue, {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
