import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { CadreAuth } from "../cadre"
import { Nouveau } from "./nouveau"

/**
 * Choisir un nouveau mot de passe.
 *
 * On n'arrive ici que par le lien du courriel, qui est passé par
 * `/auth/confirm` et y a échangé son jeton contre une session. Sans cette
 * session, l'enregistrement échoue — et c'est ce qui empêche n'importe qui
 * d'ouvrir cette page et de prendre le compte d'un autre.
 */
export default async function PageNouveauMotDePasse({
  params,
  searchParams,
}: {
  params: Promise<{ langue: string }>
  searchParams: Promise<{ lien?: string }>
}) {
  const { langue: brut } = await params
  const { lien } = await searchParams
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)
  const t = d.recuperation

  return (
    <CadreAuth
      langue={langue}
      etiquette={d.inscription.etiquette}
      phare={t.phare}
    >
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          {t.nouveauTitre}
        </h2>
        <p className="doux mt-1.5 text-sm">{t.nouveauSousTitre}</p>
      </div>

      <Nouveau perime={lien === "perime"} />
    </CadreAuth>
  )
}
