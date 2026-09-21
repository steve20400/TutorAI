"use client"

import Link from "next/link"
import { useActionState } from "react"
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
      <form action={action} className="flex flex-col gap-4">
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

        {(etat.erreur || etat.info) && (
          <p
            role="status"
            className={
              etat.erreur
                ? "rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
                : "rounded-lg bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
            }
          >
            {etat.erreur ?? etat.info}
          </p>
        )}

        <button type="submit" disabled={enCours} className="bouton mt-1 px-4 py-2.5">
          {enCours ? "Un instant…" : "Créer le compte"}
        </button>
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

function Champ({
  label,
  aide,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  aide?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input {...props} className="champ px-3 py-2.5" />
      {aide ? <span className="doux text-xs">{aide}</span> : null}
    </label>
  )
}
