"use client"

import Link from "next/link"
import { CadreAuth } from "../cadre"
import { useSearchParams } from "next/navigation"
import { Suspense, useActionState } from "react"
import { seConnecter, type EtatFormulaire } from "../actions"
import { Bouton, Champ, Message } from "../champs"

const ETAT_INITIAL: EtatFormulaire = {}

function Formulaire() {
  const parametres = useSearchParams()
  const suite = parametres.get("suite") ?? "/"
  const [etat, action, enCours] = useActionState(seConnecter, ETAT_INITIAL)

  return (
    <CadreAuth>
      <header>
        <h1 className="text-2xl font-medium">Se connecter</h1>
        <p className="doux mt-1 text-sm">
          Élève, parent ou répétiteur — même porte d&apos;entrée.
        </p>
      </header>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="suite" value={suite} />

        <Champ
          label="Email ou identifiant"
          name="email"
          type="text"
          autoComplete="username"
          required
        />
        <Champ
          label="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          required
        />

        <Message erreur={etat.erreur} info={etat.info} />

        <Bouton enCours={enCours}>Se connecter</Bouton>
      </form>

      <p className="text-center text-sm opacity-70">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
    </CadreAuth>
  )
}

export default function PageConnexion() {
  // useSearchParams impose une frontière Suspense au pré-rendu.
  return (
    <Suspense>
      <Formulaire />
    </Suspense>
  )
}
