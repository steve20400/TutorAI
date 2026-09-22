import Link from "next/link"

import { chemin, dictionnaire, estLangue, LANGUE_PAR_DEFAUT } from "@/langues"
import { CadreAuth } from "../cadre"

/**
 * Choix du rôle — la première question posée à qui arrive sur l'application.
 *
 * Elle est posée avant le formulaire, et pas comme une liste déroulante au
 * milieu des champs : le rôle détermine l'espace et les droits. Se tromper ici
 * et s'en apercevoir après coup coûte un compte à supprimer.
 */
const ORDRE = ["eleve", "parent", "repetiteur"] as const

export default async function ChoixDuRole({
  params,
}: {
  params: Promise<{ langue: string }>
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT
  const d = dictionnaire(langue)

  return (
    <CadreAuth
      langue={langue}
      etiquette={d.inscription.etiquette}
      phare={d.inscription.phare}
    >
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          {d.inscription.titre}
        </h2>
        <p className="doux mt-1.5 text-sm">{d.inscription.sousTitre}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {ORDRE.map((cle) => (
          <Link
            key={cle}
            href={chemin(langue, `/inscription/${cle}`)}
            className="choix-role"
          >
            <span className="font-medium">
              {d.inscription.roles[cle].titre}
            </span>
            <span className="doux mt-0.5 block text-sm">
              {d.inscription.roles[cle].detail}
            </span>
          </Link>
        ))}
      </div>

      <p className="doux text-sm">
        {d.inscription.dejaCompte}{" "}
        <Link
          href={chemin(langue, "/connexion")}
          className="underline underline-offset-4"
          style={{ color: "var(--texte)" }}
        >
          {d.inscription.seConnecter}
        </Link>
      </p>
    </CadreAuth>
  )
}
