"use server"

import { revalidatePath } from "next/cache"

import { dictionnaire, langueDeFormulaire } from "@/langues"
import { api, ErreurApi } from "@/lib/api"
import { exigerAdmin } from "@/lib/admin"

export type EtatLecon = { erreur?: string; info?: string }

/** Une ligne par élément. Les lignes vides ne comptent pas. */
const lignes = (v: FormDataEntryValue | null): string[] =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

/**
 * Enregistre le détail d'une leçon du programme officiel.
 *
 * La fusion se fait en base : ce qui n'est pas envoyé reste. On ne perd donc
 * pas les habiletés déjà saisies — qui n'ont pas de champ ici, parce qu'elles
 * forment un arbre et qu'un formulaire plat les écraserait.
 */
export async function enregistrerLecon(
  _precedent: EtatLecon,
  donnees: FormData,
): Promise<EtatLecon> {
  const langue = langueDeFormulaire(donnees)
  const d = dictionnaire(langue)
  const t = d.adminPages.programmes

  const programme = String(donnees.get("programme") ?? "")
  const lecon = String(donnees.get("lecon") ?? "")
  if (!programme || !lecon) return { erreur: t.echec }

  // La garde est ici aussi : une action serveur s'appelle directement, sans
  // passer par la page qui la contient.
  await exigerAdmin(langue)

  try {
    await api(`/v1/admin/programmes/${programme}/lecons/${lecon}`, {
      methode: "POST",
      corps: {
        prerequis: lignes(donnees.get("prerequis")),
        savoirs: lignes(donnees.get("savoirs")),
        savoir_faire: lignes(donnees.get("savoirFaire")),
      },
    })
  } catch (e: unknown) {
    return { erreur: e instanceof ErreurApi ? e.message : t.echec }
  }

  revalidatePath("/", "layout")
  return { info: t.enregistree }
}
