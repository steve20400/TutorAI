import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseServeur } from "@/lib/supabase/server"
import { Assistant, type OptionProgramme } from "./assistant"

export default async function PageNouveauTuteur() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

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
        <h1 className="text-xl font-medium">Aucun programme disponible</h1>
        <p className="text-sm opacity-70">
          Aucun programme officiel n&apos;est encore chargé dans la base. Un
          tuteur ne peut pas être créé tant que ce n&apos;est pas fait.
        </p>
        <p className="rounded-lg bg-amber-600/10 px-3 py-2 text-sm">
          Côté développement : insère un fichier de{" "}
          <code className="font-mono text-xs">src/data/programmes/</code> dans
          la table <code className="font-mono text-xs">programmes</code> avec{" "}
          <code className="font-mono text-xs">publie = true</code>.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Revenir à l&apos;accueil
        </Link>
      </main>
    )
  }

  return <Assistant options={options} />
}
