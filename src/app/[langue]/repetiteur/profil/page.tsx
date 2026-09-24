import { redirect } from "next/navigation"

import { BoutonDeconnexion } from "@/composants/deconnexion"
import { Registre } from "@/composants/registre"
import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { FormulaireProfil } from "./formulaire"
import { lireReferentiel } from "@/lib/referentiel"

/** Un statut inconnu en base ne doit pas faire disparaître le bandeau. */
const STATUTS = ["brouillon", "en_attente", "verifie", "refuse"] as const
type Statut = (typeof STATUTS)[number]

const TON: Record<Statut, "attente" | "ok" | "alerte"> = {
  brouillon: "attente",
  en_attente: "attente",
  verifie: "ok",
  refuse: "alerte",
}

type ReponseProfil = {
  fiche: {
    id: string
    bio: string | null
    ville: string | null
    matieres: string[] | null
    niveaux: string[] | null
    tarif_mensuel: number | null
    annees_experience: number | null
    disponibilites_texte: string | null
    statut: string
    motif_refus: string | null
    verifie_le: string | null
    photo_url: string | null
  } | null
  profil: {
    prenom: string | null
    nom: string | null
    identifiant: string | null
    telephone: string | null
    desactive_le: string | null
  } | null
}

export default async function PageProfilRepetiteur({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(chemin(langue, "/connexion"))

  // Le rôle et la fiche arrivent ensemble : un seul aller-retour vers le
  // service pour ouvrir l'écran.
  //
  // `fiche` est nulle pour qui n'est pas répétiteur — la politique de lecture
  // ne lui renvoie rien —, ce qui suffit à écarter un élève ou un parent tombé
  // sur cette adresse.
  let reponse: ReponseProfil | null = null
  try {
    reponse = await api<ReponseProfil>("/v1/repetiteur/profil")
  } catch {
    reponse = null
  }

  const profil = reponse?.profil ?? null
  const fiche = reponse?.fiche ?? null

  // Lu ici, et passé au formulaire : celui-ci est un composant client, il ne
  // peut pas appeler le service lui-même.
  const referentiel = await lireReferentiel()

  if (!fiche) redirect(chemin(langue, "/"))

  const brutStatut = fiche?.statut ?? "brouillon"
  const statut: Statut = (STATUTS as readonly string[]).includes(brutStatut)
    ? (brutStatut as Statut)
    : "brouillon"
  const etape = d.repetiteurProfil.statuts[statut]
  const ton = TON[statut]

  return (
    <Registre>
      <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">{d.repetiteurProfil.titre}</h1>
            <p className="doux mt-0.5 text-sm">
              {profil?.prenom} {profil?.nom ?? ""}
            </p>
          </div>
          <BoutonDeconnexion langue={langue} />
        </header>

        <section
          className="carte p-4"
          style={
            ton === "ok"
              ? { borderLeft: "3px solid var(--accent-doux-texte)" }
              : ton === "alerte"
                ? { borderLeft: "3px solid #b91c1c" }
                : { borderLeft: "3px solid var(--bordure)" }
          }
        >
          <div className="font-medium">{etape.titre}</div>
          <p className="doux mt-1 text-sm leading-relaxed">{etape.detail}</p>
          {fiche?.motif_refus ? (
            <p className="mt-2 rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {fiche.motif_refus}
            </p>
          ) : null}
        </section>

        <FormulaireProfil
          referentiel={referentiel}
          compteId={fiche.id}
          nom={[profil?.prenom, profil?.nom].filter(Boolean).join(" ")}
          valeurs={{
            photo_url: fiche?.photo_url ?? null,
            bio: fiche?.bio ?? "",
            ville: fiche?.ville ?? "",
            matieres: fiche?.matieres ?? [],
            niveaux: fiche?.niveaux ?? [],
            tarif_mensuel: fiche?.tarif_mensuel ?? null,
            annees_experience: fiche?.annees_experience ?? null,
            disponibilites_texte: fiche?.disponibilites_texte ?? "",
          }}
        />
      </main>
    </Registre>
  )
}
