import { notFound } from "next/navigation"
import { CadreAuth } from "../../cadre"
import { Formulaire } from "./formulaire"

const ROLES = {
  eleve: {
    titre: "Créer ton compte élève",
    sous_titre: "Tu choisiras ta classe et tes matières juste après.",
    phare: "Bienvenue.",
    tutoiement: true,
  },
  parent: {
    titre: "Créer votre compte parent",
    sous_titre:
      "Vous pourrez ensuite rattacher vos enfants et consulter leur suivi.",
    phare: "Vous saurez toujours ce qui s'est passé.",
    tutoiement: false,
  },
  repetiteur: {
    titre: "Créer votre compte répétiteur",
    sous_titre:
      "Votre profil ne sera visible des familles qu'une fois la vérification faite.",
    phare: "Votre sérieux, prouvé.",
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
    <CadreAuth etiquette="Inscription" phare={config.phare}>
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          {config.titre}
        </h2>
        <p className="doux mt-1.5 text-sm">{config.sous_titre}</p>
      </div>

      <Formulaire role={role} tutoiement={config.tutoiement} />
    </CadreAuth>
  )
}
