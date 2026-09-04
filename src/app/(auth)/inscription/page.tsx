"use client"

import Link from "next/link"
import { useActionState } from "react"
import { sInscrire, type EtatFormulaire } from "../actions"
import { Bouton, Champ, Message } from "../champs"

const ETAT_INITIAL: EtatFormulaire = {}

export default function PageInscription() {
  const [etat, action, enCours] = useActionState(sInscrire, ETAT_INITIAL)

  return (
    <>
      <header>
        <h1 className="text-2xl font-medium">Créer ton compte</h1>
        <p className="mt-1 text-sm opacity-70">
          Tu choisiras ta classe et tes matières juste après.
        </p>
      </header>

      <form action={action} className="flex flex-col gap-4">
        <Champ
          label="Ton prénom"
          name="prenom"
          autoComplete="given-name"
          required
        />
        <Champ
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Champ
          label="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          aide="8 caractères minimum"
          required
        />

        <Message erreur={etat.erreur} info={etat.info} />

        <Bouton enCours={enCours}>Créer mon compte</Bouton>
      </form>

      <p className="text-center text-sm opacity-70">
        Tu as déjà un compte ?{" "}
        <Link href="/connexion" className="underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </>
  )
}
