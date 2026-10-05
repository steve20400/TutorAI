import Link from "next/link"
import { redirect } from "next/navigation"

import { Registre } from "@/composants/registre"
import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { FormulaireProfil } from "./formulaire"
import { lireReferentiel } from "@/lib/referentiel"
import { PiecesRepetiteur, type Piece } from "@/composants/pieces-repetiteur"
import { Coque } from "@/composants/coque"

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

  // Les pièces justificatives.
  //
  // Elles décident de tout : tant qu'elles ne sont pas contrôlées, la fiche
  // n'entre pas dans l'annuaire et aucune famille ne la voit. Rien ne
  // permettait de les déposer jusqu'ici — un répétiteur pouvait s'inscrire,
  // tout remplir, et rester invisible sans comprendre pourquoi.
  let pieces: Piece[] = []
  try {
    const r = await api<{ donnees: Piece[] }>("/v1/repetiteur/pieces")
    pieces = r.donnees ?? []
  } catch {
    pieces = []
  }


  if (!fiche) redirect(chemin(langue, "/"))

  const brutStatut = fiche?.statut ?? "brouillon"
  const statut: Statut = (STATUTS as readonly string[]).includes(brutStatut)
    ? (brutStatut as Statut)
    : "brouillon"
  const etape = d.repetiteurProfil.statuts[statut]
  const ton = TON[statut]

  return (
    <Registre>
      <Coque langue={langue} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-6 lg:px-6">
        <header className="pt-2">
          {/* Le retour vers le dossier. Cette page n'est plus l'accueil du
              répétiteur mais l'atelier derrière : sans ce lien, on modifie
              sans jamais revoir le résultat. */}
          <Link
            href={chemin(langue, "/repetiteur")}
            className="doux mb-3 inline-flex items-center gap-1.5 text-[13px] transition hover:opacity-70"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="block shrink-0"
            >
              <path d="M14 7l-5 5 5 5" />
            </svg>
            {d.repetiteurAccueil.etiquette}
          </Link>
          <h1 className="text-[27px] font-medium tracking-[-0.02em] lg:text-[34px]">
            {d.repetiteurProfil.titre}
          </h1>
          <p className="doux mt-1 text-sm">
            {profil?.prenom} {profil?.nom ?? ""}
          </p>
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

        {pieces.length > 0 ? (
          <div id="pieces" className="scroll-mt-20">
            <PiecesRepetiteur
              pieces={pieces}
              verrouille={statut === "verifie"}
              langue={langue}
              d={d}
            />
          </div>
        ) : null}

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
