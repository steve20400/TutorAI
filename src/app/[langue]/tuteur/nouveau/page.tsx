import Link from "next/link"
import { redirect } from "next/navigation"

import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerModulePage } from "@/lib/parametres"
import { supabaseServeur } from "@/lib/supabase/server"
import { Assistant, type OptionProgramme } from "./assistant"

export default async function PageNouveauTuteur({
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

  // On ne charge que les colonnes d'identification — surtout pas `contenu`,
  // qui pèse plusieurs centaines de kilo-octets par programme.
  const { data: programmes } = await supabase
    .from("programmes")
    .select("id, pays, sous_systeme, niveau, matiere")
    .eq("publie", true)
    .order("niveau")
    .order("matiere")

  const options = (programmes ?? []) as OptionProgramme[]

  // Sans programme officiel chargé, il n'y a pas de tuteur possible — et c'est
  // volontaire. L'ancrage curriculaire est le produit ; sans lui il ne reste
  // qu'un assistant générique de plus.
  if (options.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-medium">{d.tuteur.aucunProgrammeTitre}</h1>
        <p className="doux text-sm">{d.tuteur.aucunProgrammeDetail}</p>
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: "color-mix(in srgb, var(--voyant) 12%, transparent)",
          }}
        >
          {/* Message de développement, pas d'interface : il ne s'adresse qu'à
              celui qui installe la base, donc il reste en français. */}
          Côté développement : insère un fichier de{" "}
          <code className="font-mono text-xs">src/data/programmes/</code> dans
          la table <code className="font-mono text-xs">programmes</code> avec{" "}
          <code className="font-mono text-xs">publie = true</code>.
        </p>
        <Link
          href={chemin(langue, "/")}
          className="text-sm underline underline-offset-4"
        >
          {d.tuteur.revenirAccueil}
        </Link>
      </main>
    )
  }

  return <Assistant options={options} />
}
