"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useActionState } from "react"

import { chemin } from "@/langues"
import { useLangue } from "@/langues/contexte"
import { CadreAuth } from "../cadre"
import { Bouton, Champ, Message } from "../champs"
import { seConnecter, type EtatFormulaire } from "@/actions/authentification"
import { AttenteLien } from "@/composants/attente-lien"

const ETAT_INITIAL: EtatFormulaire = {}

function Formulaire() {
  const { langue, d } = useLangue()
  const parametres = useSearchParams()
  const suite = parametres.get("suite") ?? chemin(langue, "/")
  const [etat, action, enCours] = useActionState(seConnecter, ETAT_INITIAL)

  return (
    <CadreAuth
      langue={langue}
      etiquette={d.connexion.etiquette}
      phare={d.connexion.phare}
    >
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">
          {d.connexion.titre}
        </h2>
        <p className="doux mt-1.5 text-sm">{d.connexion.sousTitre}</p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="suite" value={suite} />
        {/* La langue voyage avec le formulaire : l'action serveur doit savoir
            dans quelle langue rédiger ses messages et où rediriger. */}
        <input type="hidden" name="langue" value={langue} />

        <Champ
          label={d.connexion.email}
          name="email"
          type="text"
          autoComplete="username"
          required
        />
        <Champ
          label={d.connexion.motDePasse}
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          required
        />

        <Message erreur={etat.erreur} info={etat.info} />

        <Bouton enCours={enCours}>{d.connexion.valider}</Bouton>
      </form>

      {/* Sous le bouton, là où l'on regarde après un échec de connexion —
          et non en petit au-dessus, où personne ne le cherche. */}
      <Link
        href={chemin(langue, "/mot-de-passe-oublie")}
        className="doux -mt-1 text-sm underline underline-offset-4"
      >
        {d.recuperation.lien}
        <AttenteLien />
      </Link>

      <p className="doux text-sm">
        {d.connexion.pasDeCompte}{" "}
        <Link
          href={chemin(langue, "/inscription")}
          className="underline underline-offset-4"
          style={{ color: "var(--texte)" }}
        >
          {d.connexion.creerCompte}
          <AttenteLien />
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
