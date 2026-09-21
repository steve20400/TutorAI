import { redirect } from "next/navigation"
import { Registre } from "@/app/registre"
import { supabaseServeur } from "@/lib/supabase/server"
import { seDeconnecter } from "@/app/(auth)/actions"

/**
 * Accueil parent — volontairement minimal à ce stade.
 *
 * L'annuaire et le suivi des enfants arrivent aux étapes 3 et 4. Cet écran
 * existe pour qu'un parent qui se connecte atterrisse quelque part de sensé
 * plutôt que sur l'espace élève ou une page introuvable.
 */
export default async function AccueilParent() {
  const supabase = await supabaseServeur()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const { data: profil } = await supabase
    .from("profils")
    .select("prenom, role")
    .eq("id", user.id)
    .single()

  if (profil?.role !== "parent") redirect("/")

  const { count: repetiteursVerifies } = await supabase
    .from("repetiteurs")
    .select("id", { count: "exact", head: true })
    .eq("statut", "verifie")

  return (
    <Registre type="adulte">
      <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <header className="flex items-baseline justify-between pt-6">
          <div>
            <h1 className="text-2xl font-medium">Bonjour {profil.prenom}</h1>
            <p className="doux mt-0.5 text-sm">Espace parent</p>
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

        <section className="carte p-5">
          <div className="font-medium">Trouver un répétiteur</div>
          <p className="doux mt-1 text-sm leading-relaxed">
            {repetiteursVerifies && repetiteursVerifies > 0
              ? `${repetiteursVerifies} répétiteur${repetiteursVerifies > 1 ? "s" : ""} vérifié${repetiteursVerifies > 1 ? "s" : ""} pour l'instant.`
              : "Aucun répétiteur vérifié pour l'instant. L'annuaire ouvrira dès que les premiers profils auront passé la vérification."}
          </p>
          <div className="doux mt-3 text-xs uppercase tracking-wide">
            Annuaire — étape 3
          </div>
        </section>

        <section className="carte p-5">
          <div className="font-medium">Mes enfants</div>
          <p className="doux mt-1 text-sm leading-relaxed">
            Rattacher un enfant à votre compte vous donnera accès à son suivi :
            progression, comptes rendus de séance, enregistrements des cours.
          </p>
          <div className="doux mt-3 text-xs uppercase tracking-wide">
            Suivi — étape 4
          </div>
        </section>
      </main>
    </Registre>
  )
}
