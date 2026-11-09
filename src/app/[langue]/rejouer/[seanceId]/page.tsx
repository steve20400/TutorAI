import { redirect } from "next/navigation"

import { Coque } from "@/composants/coque"
import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"
import { Lecteur } from "./lecteur"

/**
 * Rejouer une séance enregistrée.
 *
 * ── CE QUE CET ÉCRAN EXISTE POUR FAIRE ──
 *
 * Le jour où un parent signale quelque chose, il faut pouvoir REGARDER. Sans
 * cet écran, la trace s'accumulait depuis des jours sans que personne puisse
 * l'ouvrir — et l'administration proposait « Lire l'enregistrement » devant
 * un lecteur vidéo qui n'aurait jamais rien à lire.
 *
 * ── UNE SEULE ROUTE POUR TOUT LE MONDE ──
 *
 * L'administration qui traite un signalement, et le parent qui veut revoir le
 * cours de son enfant, ouvrent le même écran. Ce n'est pas une économie : la
 * RLS décide déjà qui a le droit — `ma_seance` couvre les deux parties et
 * l'adulte du contrat, `est_admin` couvre l'administration. Deux écrans
 * auraient voulu dire deux fois la règle, et c'est la copie oubliée qui
 * ouvre ce qui devait rester fermé.
 *
 * ── CE QU'ON NE CHARGE PAS ICI ──
 *
 * La trace elle-même. Elle peut faire quelques milliers de lignes, et les
 * faire transiter par le rendu serveur retarderait l'affichage de tout
 * l'écran. Le navigateur la charge par pages, et la barre de lecture se
 * remplit pendant qu'elles arrivent.
 */
export default async function PageRejouer({
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

  // La RLS tranche : une séance qu'on n'a pas le droit de relire ne remonte
  // pas. On n'écrit donc aucune règle d'accès ici — il n'y en aurait qu'une
  // de plus à tenir en accord avec celle de la base.
  const { data: seance } = await supabase
    .from("seances_humaines")
    .select(
      "id, demarree_le, terminee_le, lecon_id, contrat:contrats!inner (matiere)",
    )
    .eq("id", seanceId)
    .maybeSingle()

  if (!seance) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Coque langue={langue} />
        <main className="mx-auto w-full max-w-2xl px-4 py-10">
          <h1 className="text-[22px] font-medium">{d.relecture.absente}</h1>
          <p className="doux mt-2 text-[13px] leading-relaxed">
            {d.relecture.absenteDetail}
          </p>
        </main>
      </div>
    )
  }

  const { data: feuilles } = await supabase
    .from("feuilles")
    .select("id, rang, titre, outil")
    .eq("seance_id", seanceId)
    .order("rang", { ascending: true })

  const contrat = Array.isArray(seance.contrat)
    ? seance.contrat[0]
    : seance.contrat

  return (
    <div className="flex h-dvh flex-col">
      <Coque langue={langue} />
      <Lecteur
        seanceId={seanceId}
        feuilles={(feuilles ?? []) as { id: string; rang: number; titre: string | null; outil: string }[]}
        titre={
          (seance.lecon_id as string | null) ??
          (contrat?.matiere as string | null) ??
          d.salle.titre
        }
        retourVers={chemin(langue, "/")}
        d={d}
      />
    </div>
  )
}
