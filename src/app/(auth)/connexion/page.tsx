"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useActionState } from "react"

import { CadreAuth } from "../cadre"
import { Bouton, Champ, Message } from "../champs"
import { seConnecter, type EtatFormulaire } from "../actions"

const ETAT_INITIAL: EtatFormulaire = {}

function Formulaire() {
  const parametres = useSearchParams()
  const suite = parametres.get("suite") ?? "/"
  const [etat, action, enCours] = useActionState(seConnecter, ETAT_INITIAL)

  return (
    <CadreAuth etiquette="Connexion" phare="Content de te revoir.">
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          Bon retour.
        </h2>
        <p className="doux mt-1.5 text-sm">
          Élève, parent ou répétiteur — même porte d&apos;entrée.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
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

      <p className="doux text-sm">
        Pas encore de compte ?{" "}
        <Link
          href="/inscription"
          className="underline underline-offset-4"
          style={{ color: "var(--texte)" }}
        >
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
