"use client"

import Link from "next/link"
import { useActionState } from "react"

import { chemin } from "@/langues"
import { useLangue } from "@/langues/contexte"
import { Bouton, Champ, Message } from "../../champs"
import { sInscrire, type EtatFormulaire } from "@/actions/authentification"

const ETAT_INITIAL: EtatFormulaire = {}

export function Formulaire({
  role,
}: {
  role: "eleve" | "parent" | "repetiteur"
}) {
  const { langue, d } = useLangue()
  const [etat, action, enCours] = useActionState(sInscrire, ETAT_INITIAL)

  const t = d.inscriptionRole[role]
  const c = d.inscriptionRole

  return (
    <>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="langue" value={langue} />

        <Champ label={t.prenom} name="prenom" autoComplete="given-name" required />

        {role !== "eleve" && (
          <Champ label={c.nom} name="nom" autoComplete="family-name" />
        )}

        <Champ
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
          required
        />

        {role === "repetiteur" && (
          <Champ
            label={c.telephone}
            name="telephone"
            type="tel"
            autoComplete="tel"
            aide={c.aideTelephone}
          />
        )}

        <Champ
          label={t.motDePasse}
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          aide={c.aideMotDePasse}
          required
        />

        <Message erreur={etat.erreur} info={etat.info} />

        <Bouton enCours={enCours}>{c.valider}</Bouton>
      </form>

      <div className="doux flex justify-between text-sm">
        <Link
          href={chemin(langue, "/inscription")}
          className="underline underline-offset-4"
        >
          {c.changerRole}
        </Link>
        <Link
          href={chemin(langue, "/connexion")}
          className="underline underline-offset-4"
        >
          {c.seConnecter}
        </Link>
      </div>
    </>
  )
}
