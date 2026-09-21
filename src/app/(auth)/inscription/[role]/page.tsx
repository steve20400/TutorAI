import { notFound } from "next/navigation"
import { CadreAuth } from "../../cadre"
import { Formulaire } from "./formulaire"

const ROLES = {
  eleve: {
    titre: "Créer ton compte élève",
    sous_titre: "Tu choisiras ta classe et tes matières juste après.",
    registre: "eleve",
    tutoiement: true,
  },
  parent: {
    titre: "Créer votre compte parent",
    sous_titre:
      "Vous pourrez ensuite rattacher vos enfants et consulter leur suivi.",
    registre: "adulte",
    tutoiement: false,
  },
  repetiteur: {
    titre: "Créer votre compte répétiteur",
    sous_titre:
      "Votre profil ne sera visible des familles qu'une fois la vérification faite.",
    registre: "adulte",
    tutoiement: false,
  },
} as const

export function generateStaticParams() {
  return Object.keys(ROLES).map((role) => ({ role }))
}

export default async function PageInscription({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = await params

  if (!(role in ROLES)) notFound()
  const config = ROLES[role as keyof typeof ROLES]

  return (
    <CadreAuth registre={config.registre}>
      <header>
          <h1 className="text-2xl font-medium">{config.titre}</h1>
        <p className="doux mt-1 text-sm">{config.sous_titre}</p>
      </header>

      <Formulaire role={role} tutoiement={config.tutoiement} />
    </CadreAuth>
  )
}
