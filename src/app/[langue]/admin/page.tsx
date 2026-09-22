import { redirect } from "next/navigation"

import { BoutonDeconnexion } from "@/composants/deconnexion"
import { Registre } from "@/composants/registre"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
  remplir,
  type Dictionnaire,
  type Langue,
} from "@/langues"
import { supabaseServeur } from "@/lib/supabase/server"
import { lireParametres } from "@/lib/parametres"
import { basculerParametre, changerResolution } from "@/actions/admin"

/** Modules pilotables, dans l'ordre d'affichage. */
const MODULES = [
  "ia_active",
  "enregistrement_actif",
  "paiement_actif",
  "inscriptions_ouvertes",
] as const

/** Poids approximatif d'une heure de cours, par résolution. */
const COUT_PAR_HEURE = {
  "360p": "200 Mo",
  "480p": "350 Mo",
  "720p": "700 Mo",
} as const

export default async function EspaceAdmin({
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

  const { data: profil } = await supabase
    .from("profils")
    .select("role, identifiant")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "admin") redirect(chemin(langue, "/"))

  const parametres = await lireParametres()

  const [comptes, repetiteursAttente] = await Promise.all([
    supabase.from("profils").select("role"),
    supabase
      .from("repetiteurs")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en_attente"),
  ])

  const parRole = (r: string) =>
    comptes.data?.filter((c) => c.role === r).length ?? 0

  const aVerifier = repetiteursAttente.count ?? 0
  const resolution = parametres.resolution_video as keyof typeof COUT_PAR_HEURE

  return (
    <Registre>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">{d.admin.titre}</h1>
            <p className="doux mt-0.5 text-sm">{profil.identifiant}</p>
          </div>
          <BoutonDeconnexion langue={langue} />
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Chiffre valeur={parRole("eleve")} libelle={d.admin.eleves} />
          <Chiffre valeur={parRole("parent")} libelle={d.admin.parents} />
          <Chiffre
            valeur={parRole("repetiteur")}
            libelle={d.admin.repetiteurs}
          />
          <Chiffre
            valeur={aVerifier}
            libelle={d.admin.aVerifier}
            alerte={aVerifier > 0}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="doux text-sm font-medium uppercase tracking-wide">
            {d.admin.modules}
          </h2>

          {MODULES.map((cle) => (
            <Interrupteur
              key={cle}
              cle={cle}
              d={d}
              langue={langue}
              actif={parametres[cle]}
              // Un enregistrement éteint est le seul réglage qui mérite un
              // avertissement : c'est la promesse faite aux parents qui tombe.
              avertissement={
                cle === "enregistrement_actif" && !parametres[cle]
              }
            />
          ))}
        </section>

        <section className="carte p-4">
          <div className="font-medium">{d.admin.resolutionTitre}</div>
          <p className="doux mt-1 text-sm leading-relaxed">
            {d.admin.resolutionDetail}
          </p>
          <form action={changerResolution} className="mt-3 flex gap-2">
            <input type="hidden" name="langue" value={langue} />
            {(Object.keys(COUT_PAR_HEURE) as (keyof typeof COUT_PAR_HEURE)[]).map(
              (r) => (
                <button
                  key={r}
                  type="submit"
                  name="resolution"
                  value={r}
                  className={
                    parametres.resolution_video === r
                      ? "bouton px-4 py-2 text-sm"
                      : "champ px-4 py-2 text-sm"
                  }
                >
                  {r}
                </button>
              ),
            )}
          </form>
          <p className="doux mt-2 text-xs">
            {remplir(d.admin.resolutionCout, {
              taille: COUT_PAR_HEURE[resolution] ?? "350 Mo",
            })}
          </p>
        </section>

        <p className="doux text-center text-xs leading-relaxed">
          {d.admin.journal}
        </p>
      </main>
    </Registre>
  )
}

function Chiffre({
  valeur,
  libelle,
  alerte,
}: {
  valeur: number
  libelle: string
  alerte?: boolean
}) {
  return (
    <div className="carte p-3">
      <div
        className="text-2xl font-medium"
        style={alerte ? { color: "var(--voyant)" } : undefined}
      >
        {valeur}
      </div>
      <div className="doux text-xs">{libelle}</div>
    </div>
  )
}

function Interrupteur({
  cle,
  d,
  langue,
  actif,
  avertissement,
}: {
  cle: (typeof MODULES)[number]
  d: Dictionnaire
  langue: Langue
  actif: boolean
  avertissement?: boolean
}) {
  const textes = d.admin.interrupteurs[cle]

  return (
    <form action={basculerParametre} className="carte flex gap-4 p-4">
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="cle" value={cle} />
      <input type="hidden" name="valeur" value={String(!actif)} />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{textes.titre}</span>
          <span className={actif ? "badge-verifie" : "badge-eteint"}>
            {actif ? d.admin.actif : d.admin.eteint}
          </span>
        </div>
        <p className="doux mt-1 text-sm leading-relaxed">{textes.detail}</p>
        {avertissement ? (
          <p className="mt-2 text-xs" style={{ color: "var(--voyant)" }}>
            {d.admin.avertissementEnregistrement}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className={
          actif
            ? "champ self-start px-3 py-1.5 text-sm"
            : "bouton self-start px-3 py-1.5 text-sm"
        }
      >
        {actif ? d.admin.eteindre : d.admin.activer}
      </button>
    </form>
  )
}
