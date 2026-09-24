import { dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { CadreAuth } from "../cadre"
import { Demande } from "./demande"

/**
 * Retrouver son compte.
 *
 * Pour les adultes et les répétiteurs, qui ont une adresse. Un enfant n'en a
 * pas — c'est voulu, une adresse serait un canal vers lui qui ne passe pas
 * par la plateforme. Un encart le lui dit, plutôt que de le laisser saisir
 * une adresse qu'il n'a pas et attendre un courriel qui ne viendra jamais.
 */
export default async function PageMotDePasseOublie({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
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
          {t.titre}
        </h2>
        <p className="doux mt-1.5 text-sm">{t.sousTitre}</p>
      </div>

      <Demande />
    </CadreAuth>
  )
}
