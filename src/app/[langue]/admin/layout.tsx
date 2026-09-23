import { cookies } from "next/headers"

import { BarreAdmin } from "@/composants/admin/barre"
import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { exigerAdmin } from "@/lib/admin"
import { api } from "@/lib/api"

/**
 * Coquille de l'espace d'administration.
 *
 * La garde est ici plutôt que répétée dans chaque page : une page ajoutée plus
 * tard hériterait sinon d'une route ouverte, et personne ne s'en apercevrait
 * avant qu'il soit trop tard.
 */
export default async function LayoutAdmin({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  const profil = await exigerAdmin(langue)

  // Le compteur de la barre : il doit être juste sur toutes les pages, donc il
  // se lit ici et non dans la page des dossiers.
  //
  // Une panne du service ne doit pas fermer l'administration : la garde a déjà
  // vérifié le rôle, et une pastille manquante vaut mieux qu'un écran blanc.
  let count = 0
  try {
    const { donnees } = await api<{ donnees: unknown[] }>("/v1/admin/dossiers")
    count = donnees.length
  } catch {
    count = 0
  }

  // Un échec d'action laisse un témoin de quinze secondes. Il est lu ici, une
  // seule fois pour tout l'espace : sans lui, un refus de l'API se traduisait
  // par une page rechargée à l'identique, indiscernable d'un clic sans effet.
  const probleme = (await cookies()).get("tutela_probleme")?.value ?? null

  return (
    <div
      // Colonne sur téléphone : l'en-tête de la barre se pose au-dessus de la
      // page. Ligne à partir de `lg`, où la barre reprend sa place à gauche.
      className="flex h-dvh flex-col overflow-hidden lg:flex-row"
      style={{ background: "var(--fond)", color: "var(--texte)" }}
    >
      <BarreAdmin
        langue={langue}
        d={d}
        identifiant={profil.identifiant}
        nom={profil.prenom}
        photoUrl={profil.photo_url ?? null}
        aVerifier={count}
      />
      <main className="flex-1 overflow-y-auto">
        {probleme ? (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-[10px] px-4 py-3 text-[13px] lg:mx-7"
            style={{
              background: "var(--erreur-fond, color-mix(in srgb, var(--erreur-texte) 12%, var(--fond)))",
              color: "var(--erreur-texte)",
            }}
          >
            {probleme}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
