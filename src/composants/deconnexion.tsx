import { seDeconnecter } from "@/actions/authentification"
import { dictionnaire, type Langue } from "@/langues"

/**
 * Bouton de déconnexion.
 *
 * Il existe comme composant parce que l'action a besoin de la langue pour
 * savoir sur quelle page de connexion renvoyer : un champ caché oublié sur une
 * seule page renverrait cet utilisateur-là en français quoi qu'il arrive.
 */
export function BoutonDeconnexion({
  langue,
  libelle,
}: {
  langue: Langue
  /** Par défaut « Se déconnecter » ; « Quitter » sur l'espace élève. */
  libelle?: string
}) {
  const d = dictionnaire(langue)

  return (
    <form action={seDeconnecter}>
      <input type="hidden" name="langue" value={langue} />
      <button
        type="submit"
        className="doux text-sm underline underline-offset-4 transition hover:opacity-70"
      >
        {libelle ?? d.commun.seDeconnecter}
      </button>
    </form>
  )
}
