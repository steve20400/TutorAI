import { notFound } from "next/navigation"

import { dictionnaire, estLangue, LANGUES, LANGUE_PAR_DEFAUT } from "@/langues"
import { CadreAuth } from "../../cadre"
import { Formulaire } from "./formulaire"

/** Rôles qu'un visiteur peut se donner lui-même. `admin` n'en fait pas partie. */
const ROLES = ["eleve", "parent", "repetiteur"] as const
type Role = (typeof ROLES)[number]

export function generateStaticParams() {
  return LANGUES.flatMap((langue) => ROLES.map((role) => ({ langue, role })))
}

export default async function PageInscription({
  params,
}: {
  params: Promise<{ langue: string; role: string }>
}) {
  const { langue: brut, role } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT

  if (!(ROLES as readonly string[]).includes(role)) notFound()
  const cle = role as Role

  const d = dictionnaire(langue)
  const textes = d.inscriptionRole[cle]

  return (
    <CadreAuth
      langue={langue}
      etiquette={d.inscription.etiquette}
      phare={textes.phare}
    >
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          {textes.titre}
        </h2>
        <p className="doux mt-1.5 text-sm">{textes.sousTitre}</p>
      </div>

      <Formulaire role={cle} />
    </CadreAuth>
  )
}
