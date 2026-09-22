"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Bouton, Champ, Message } from "../../champs"
import { sInscrire, type EtatFormulaire } from "../../actions"

const ETAT_INITIAL: EtatFormulaire = {}

export function Formulaire({
  role,
  tutoiement,
}: {
  role: string
  tutoiement: boolean
}) {
  const [etat, action, enCours] = useActionState(sInscrire, ETAT_INITIAL)

  // Un élève de Terminale et un parent ne se parlent pas de la même façon.
  const t = tutoiement
    ? { prenom: "Ton prénom", email: "Ton email", mdp: "Ton mot de passe" }
    : { prenom: "Votre prénom", email: "Votre email", mdp: "Votre mot de passe" }

  return (
    <>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="role" value={role} />

        <Champ label={t.prenom} name="prenom" autoComplete="given-name" required />

        {role !== "eleve" && (
          <Champ label="Votre nom" name="nom" autoComplete="family-name" />
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
            label="Votre téléphone"
            name="telephone"
            type="tel"
            autoComplete="tel"
            aide="Utilisé par l'équipe pour la vérification, jamais affiché aux familles"
          />
        )}

        <Champ
          label={t.mdp}
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          aide="8 caractères minimum"
          required
        />

        <Message erreur={etat.erreur} info={etat.info} />

        <Bouton enCours={enCours}>Créer le compte</Bouton>
      </form>

      <div className="doux flex justify-between text-sm">
        <Link href="/inscription" className="underline underline-offset-4">
          Changer de rôle
        </Link>
        <Link href="/connexion" className="underline underline-offset-4">
          Se connecter
        </Link>
      </div>
    </>
  )
}
