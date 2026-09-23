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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
