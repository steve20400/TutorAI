import { redirect } from "next/navigation"
import { Registre } from "@/app/registre"
import { supabaseServeur } from "@/lib/supabase/server"
import { seDeconnecter } from "@/app/(auth)/actions"
import { FormulaireProfil } from "./formulaire"

const ETAPES: Record<
  string,
  { titre: string; detail: string; ton: "attente" | "ok" | "alerte" }
> = {
  brouillon: {
    titre: "Profil non soumis",
    detail:
      "Complétez votre profil puis soumettez-le. Tant qu'il n'est pas vérifié, aucune famille ne peut le voir.",
    ton: "attente",
  },
  en_attente: {
    titre: "Vérification en cours",
    detail:
      "Notre équipe examine vos pièces. Vous serez prévenu dès que c'est terminé.",
    ton: "attente",
  },
  verifie: {
    titre: "Profil vérifié",
    detail: "Votre profil est visible des familles dans l'annuaire.",
    ton: "ok",
  },
  refuse: {
    titre: "Profil refusé",
    detail: "Consultez le motif ci-dessous, corrigez, puis soumettez à nouveau.",
    ton: "alerte",
  },
}

export default async function PageProfilRepetiteur() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom, nom, role")
    .eq("id", user.id)
    .single()

  // Un élève ou un parent qui tomberait sur cette adresse n'a rien à y faire.
  if (profil?.role !== "repetiteur") redirect("/")

  const { data: fiche } = await supabase
    .from("repetiteurs")
    .select(
      "bio, ville, matieres, niveaux, tarif_mensuel, annees_experience, disponibilites_texte, statut, motif_refus",
    )
    .eq("id", user.id)
    .single()

  const etape = ETAPES[fiche?.statut ?? "brouillon"]

  return (
    <Registre type="adulte">
      <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">Mon profil</h1>
            <p className="doux mt-0.5 text-sm">
              {profil.prenom} {profil.nom ?? ""}
            </p>
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

        <section
          className="carte p-4"
          style={
            etape.ton === "ok"
              ? { borderLeft: "3px solid var(--accent-doux-texte)" }
              : etape.ton === "alerte"
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
          valeurs={{
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
