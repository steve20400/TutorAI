import { redirect } from "next/navigation"

import { chemin, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerModulePage } from "@/lib/parametres"
import { api } from "@/lib/api"
import { lireReferentiel } from "@/lib/referentiel"
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

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  // On ne charge que les colonnes d'identification — surtout pas `contenu`,
  // qui pèse plusieurs centaines de kilo-octets par programme.
  const { donnees: programmes } = await api<{ donnees: OptionProgramme[] }>(
    "/v1/programmes",
  )

  const options = (programmes ?? []) as OptionProgramme[]

  // Le catalogue complet, programme chargé ou non. Il ne sert qu'à suggérer :
  // l'élève reste libre d'écrire une matière que personne n'a encore demandée.
  const { matieres: catalogue, niveaux } = await lireReferentiel()

  // Le pays de l'élève, et non celui du seul programme chargé. Junior est
  // camerounais ; lui annoncer « Côte d'Ivoire » parce que le seul programme
  // en base est ivoirien n'a aucun sens de son point de vue.
  const { data: profil } = await supabase
    .from("profils")
    .select("pays")
    .eq("id", user.id)
    .maybeSingle()

  // Aucun écran bloquant : même sans le moindre programme chargé, un élève
  // choisit son niveau dans le référentiel et nomme sa matière lui-même. Il
  // y avait ici un message destiné à celui qui installe la base — du texte de
  // développement dans une interface d'élève, ce qui n'a jamais sa place.

  return (
    <Assistant
      options={options}
      catalogue={catalogue}
      niveaux={niveaux}
      paysEleve={(profil?.pays as string) ?? ""}
    />
  )
}
