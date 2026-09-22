import Link from "next/link"
import { redirect } from "next/navigation"

import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerModulePage } from "@/lib/parametres"
import { supabaseServeur } from "@/lib/supabase/server"

export default async function PageTuteurs({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
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

  const { data: tuteurs } = await supabase
    .from("tuteurs_ia")
    .select("id, matiere, niveau, manuels")
    .eq("eleve_id", user.id)
    .order("cree_le", { ascending: true })

  if (!tuteurs || tuteurs.length === 0) {
    redirect(chemin(langue, "/tuteur/nouveau"))
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between pt-8">
        <h1 className="text-2xl font-medium">{d.tuteur.mesTuteurs}</h1>
        <Link
          href={chemin(langue, "/")}
          className="doux text-sm underline underline-offset-4 hover:opacity-100"
        >
          {d.tuteur.accueil}
        </Link>
      </header>

      <ul className="flex flex-col gap-3">
        {tuteurs.map((t) => (
          <li key={t.id}>
            <Link
              href={chemin(langue, `/tuteur/${t.id}`)}
              className="choix-role"
            >
              {/* La matière et le niveau sont stockés en français : on affiche
                  l'étiquette de la langue courante, la valeur ne bouge pas. */}
              <span className="font-medium">
                {d.matieres[t.matiere] ?? t.matiere}
              </span>
              <span className="doux mt-0.5 block text-sm">
                {d.niveaux[t.niveau] ?? t.niveau}
              </span>
              {Array.isArray(t.manuels) && t.manuels.length > 0 ? (
                <span className="doux mt-2 block text-xs">
                  {(t.manuels as { titre: string }[])
                    .map((m) => m.titre)
                    .join(" · ")}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={chemin(langue, "/tuteur/nouveau")}
        className="doux self-start text-sm underline underline-offset-4"
      >
        {d.tuteur.ajouterMatiere}
      </Link>
    </main>
  )
}
