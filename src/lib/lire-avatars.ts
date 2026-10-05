import { AVATARS, type Avatar } from "./avatars"
import { api } from "./api"

/**
 * Les cinquante avatars, lus une fois par rendu de la mise en page.
 *
 * En cas de panne, les douze du code : un écran de choix vide est un écran
 * dont on ne sort pas, et un avatar déjà choisi doit continuer de s'afficher
 * au lieu de retomber en initiales sans explication.
 */
export async function lireAvatars(): Promise<readonly Avatar[]> {
  try {
    const r = await api<{ donnees: Avatar[] }>("/v1/avatars", {
      sansSession: true,
    })
    return r.donnees?.length ? r.donnees : AVATARS
  } catch {
    return AVATARS
  }
}
