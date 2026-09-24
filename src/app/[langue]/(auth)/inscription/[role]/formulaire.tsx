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

        {/* Pas d'adresse pour un enfant.

            Une adresse est un canal vers lui qui ne passe pas par la
            plateforme, et tout le produit est bâti pour qu'aucun adulte n'ait
            de canal privé vers un enfant. La contrepartie est qu'il ne peut
            pas récupérer son mot de passe tant qu'aucun adulte ne lui est
            rattaché — et on le lui dit AVANT qu'il ne choisisse, pas après
            l'avoir oublié. */}
        {role !== "eleve" && (
          <Champ
            label={t.email}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        )}

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

        {role === "eleve" && (
          <p
            className="rounded-[10px] px-3 py-2.5 text-[12.5px] leading-relaxed"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            {c.avertissementEnfant}
          </p>
        )}

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
