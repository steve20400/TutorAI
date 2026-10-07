import { notFound, redirect } from "next/navigation"

import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"
import { Salle, type Feuille } from "./salle"

/**
 * La salle d'une séance humaine.
 *
 * Aucune route de service ici, et c'est délibéré : la salle lit `feuilles` et
 * `seances_humaines` par les politiques de la migration 072, qui disent déjà
 * qui voit quoi. Passer par le service ajouterait un aller-retour vers un
 * processus qui dort après quinze minutes — sur l'écran où une attente de
 * cinquante secondes est la moins supportable de toute l'application.
 *
 * Ce que la page décide, et que le navigateur ne doit pas décider :
 *
 * — QUI TIENT LA SÉANCE. Le répétiteur et l'élève écrivent ; l'adulte qui a
 *   signé le contrat regarde. La politique l'impose déjà en base, mais
 *   l'écran doit le savoir pour ne pas offrir un stylet à qui ne peut pas
 *   écrire : un outil qui refuse en silence est pire qu'un outil absent.
 *
 * — LA PREMIÈRE FEUILLE. Une salle sans feuille est une salle vide, et
 *   demander « créez une feuille » à quelqu'un qui vient faire un cours est
 *   une marche de plus avant de commencer.
 */
export default async function PageSalle({
  params,
}: {
  params: Promise<{ langue: string; seanceId: string }>
}) {
  const { langue: brut, seanceId } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))

  // La RLS filtre : une séance qui n'est pas la sienne ne remonte pas, et
  // `notFound` ne dit pas si elle existe ailleurs.
  const { data: seance } = await supabase
    .from("seances_humaines")
    .select("id, terminee_le, lecon_id, contrat:contrats!inner (matiere, repetiteur_id, eleve_id)")
    .eq("id", seanceId)
    .maybeSingle()

  if (!seance) notFound()

  const contrat = Array.isArray(seance.contrat) ? seance.contrat[0] : seance.contrat
  const estRepetiteur = contrat?.repetiteur_id === user.id
  const estEleve = contrat?.eleve_id === user.id

  // Une séance close se relit, elle ne se réécrit pas. C'est ce qui sépare un
  // cahier d'une pièce : on peut consulter les deux, on n'ajoute plus rien à
  // la seconde.
  const lecture = Boolean(seance.terminee_le) || (!estRepetiteur && !estEleve)

  let feuilles: Feuille[] = []
  const { data: lues } = await supabase
    .from("feuilles")
    .select("id, rang, titre, outil")
    .eq("seance_id", seanceId)
    .order("rang")
  feuilles = (lues ?? []) as Feuille[]

  // Aucune feuille et le droit d'écrire : on en ouvre une. Un cours commence
  // sur une feuille blanche, pas sur un bouton « créer une feuille ».
  if (feuilles.length === 0 && !lecture) {
    const { data: creee } = await supabase
      .from("feuilles")
      .insert({ seance_id: seanceId, rang: 0, outil: "main_levee" })
      .select("id, rang, titre, outil")
      .maybeSingle()
    if (creee) feuilles = [creee as Feuille]
  }

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom")
    .eq("id", user.id)
    .maybeSingle()

  const titre =
    (seance.lecon_id as string | null) ??
    (contrat?.matiere as string | null) ??
    d.salle.titre

  return (
    <Salle
      seanceId={seanceId}
      feuilles={feuilles}
      moi={{
        id: user.id,
        nom: (profil?.prenom as string | null) ?? "—",
        estRepetiteur,
      }}
      lecture={lecture}
      titre={titre}
      d={d}
    />
  )
}
