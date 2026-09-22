import { redirect } from "next/navigation"
import { Registre } from "@/app/registre"
import { supabaseServeur } from "@/lib/supabase/server"
import { seDeconnecter } from "@/app/(auth)/actions"
import { lireParametres } from "@/lib/parametres"
import { basculerParametre, changerResolution } from "./actions"

export default async function EspaceAdmin() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const { data: profil } = await supabase
    .from("profils")
    .select("role, identifiant")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "admin") redirect("/")

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

  return (
    <Registre type="adulte">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">Administration</h1>
            <p className="doux mt-0.5 text-sm">{profil.identifiant}</p>
          </div>
          <form action={seDeconnecter}>
            <button
              type="submit"
              className="doux text-sm underline underline-offset-4"
            >
              Se déconnecter
            </button>
          </form>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Chiffre valeur={parRole("eleve")} libelle="Élèves" />
          <Chiffre valeur={parRole("parent")} libelle="Parents" />
          <Chiffre valeur={parRole("repetiteur")} libelle="Répétiteurs" />
          <Chiffre
            valeur={repetiteursAttente.count ?? 0}
            libelle="À vérifier"
            alerte={(repetiteursAttente.count ?? 0) > 0}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="doux text-sm font-medium uppercase tracking-wide">
            Modules
          </h2>

          <Interrupteur
            cle="ia_active"
            actif={parametres.ia_active}
            titre="Tuteur IA"
            detail="Tant qu'il est éteint, l'écran de création du tuteur n'apparaît pas et la route qui appelle le modèle refuse. Nécessite une clé Anthropic."
          />

          <Interrupteur
            cle="enregistrement_actif"
            actif={parametres.enregistrement_actif}
            titre="Enregistrement des séances"
            detail="Éteins-le en développement pour ne pas consommer de stockage. En production il doit rester allumé : c'est la promesse faite aux parents."
            avertissement={!parametres.enregistrement_actif}
          />

          <Interrupteur
            cle="paiement_actif"
            actif={parametres.paiement_actif}
            titre="Paiement mobile money"
            detail="Orange Money et MTN MoMo. Nécessite les clés d'API d'un agrégateur."
          />

          <Interrupteur
            cle="inscriptions_ouvertes"
            actif={parametres.inscriptions_ouvertes}
            titre="Nouvelles inscriptions"
            detail="Ferme la porte sans couper l'application pour ceux qui ont déjà un compte."
          />
        </section>

        <section className="carte p-4">
          <div className="font-medium">Résolution des enregistrements</div>
          <p className="doux mt-1 text-sm leading-relaxed">
            Un enregistrement de sécurité doit être lisible, pas beau. Plus la
            résolution est basse, moins il coûte en stockage — et mieux il passe
            sur les réseaux de tes utilisateurs.
          </p>
          <form action={changerResolution} className="mt-3 flex gap-2">
            {(["360p", "480p", "720p"] as const).map((r) => (
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
            ))}
          </form>
          <p className="doux mt-2 text-xs">
            ≈{" "}
            {parametres.resolution_video === "360p"
              ? "200 Mo"
              : parametres.resolution_video === "480p"
                ? "350 Mo"
                : "700 Mo"}{" "}
            par heure de cours.
          </p>
        </section>

        <p className="doux text-center text-xs leading-relaxed">
          Chaque changement est inscrit au journal d&apos;administration, avec
          son auteur et son horodatage.
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
        style={alerte ? { color: "#b45309" } : undefined}
      >
        {valeur}
      </div>
      <div className="doux text-xs">{libelle}</div>
    </div>
  )
}

function Interrupteur({
  cle,
  actif,
  titre,
  detail,
  avertissement,
}: {
  cle: string
  actif: boolean
  titre: string
  detail: string
  avertissement?: boolean
}) {
  return (
    <form action={basculerParametre} className="carte flex gap-4 p-4">
      <input type="hidden" name="cle" value={cle} />
      <input type="hidden" name="valeur" value={String(!actif)} />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{titre}</span>
          <span className={actif ? "badge-verifie" : "badge-eteint"}>
            {actif ? "Actif" : "Éteint"}
          </span>
        </div>
        <p className="doux mt-1 text-sm leading-relaxed">{detail}</p>
        {avertissement ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
            ⚠ Aucune séance n&apos;est enregistrée tant que c&apos;est éteint.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className={actif ? "champ self-start px-3 py-1.5 text-sm" : "bouton self-start px-3 py-1.5 text-sm"}
      >
        {actif ? "Éteindre" : "Activer"}
      </button>
    </form>
  )
}
