import { Registre } from "@/composants/registre"
import {
  chemin,
  dictionnaire,
  estLangue,
  LANGUE_PAR_DEFAUT,
} from "@/langues"
import { api } from "@/lib/api"
import { supabaseServeur } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Liste, type DemandeMotDePasse } from "./liste"

/**
 * Les demandes de mot de passe des enfants.
 *
 * Un enfant qui a perdu son mot de passe n'a rien d'autre à faire qu'attendre.
 * C'est le second canal, à côté du courriel — et il ne dépend d'aucun service
 * d'envoi : l'enfant n'est donc jamais bloqué par le courrier, ni par une
 * boîte que personne n'ouvre.
 */
export default async function PageMotsDePasse({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.recuperation

  // La même garde que l'espace du parent : la page est servie, et une page
  // servie ne se protège pas toute seule.
  const supabase = await supabaseServeur()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(chemin(langue, "/connexion"))

  let demandes: DemandeMotDePasse[] = []
  try {
    const rep = await api<{ donnees: DemandeMotDePasse[] }>(
      "/v1/liens/mots-de-passe",
    )
    demandes = rep.donnees ?? []
  } catch {
    demandes = []
  }

  return (
    <Registre>
      <main className="mx-auto flex max-w-lg flex-col gap-5 p-6">
        <header className="pt-6">
          <Link
            href={chemin(langue, "/parent")}
            className="doux text-[12px] hover:underline"
          >
            ‹ {d.admin.retour}
          </Link>
          <h1 className="mt-1.5 text-2xl font-medium">{t.pageTitre}</h1>
          <p className="doux mt-1 text-sm leading-relaxed">{t.pageDetail}</p>
        </header>

        {demandes.length === 0 ? (
          <p
            className="rounded-[10px] px-4 py-3 text-[13px] leading-relaxed"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            {t.pageAucune}
          </p>
        ) : (
          <Liste langue={langue} demandes={demandes} />
        )}
      </main>
    </Registre>
  )
}
