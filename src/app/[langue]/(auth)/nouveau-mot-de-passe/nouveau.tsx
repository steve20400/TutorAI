"use client"

import Link from "next/link"
import { useActionState } from "react"

import { chemin } from "@/langues"
import { useLangue } from "@/langues/contexte"
import { Bouton, Champ, Message } from "../champs"
import { poserLeMotDePasse, type EtatRecuperation } from "@/actions/recuperation"

const ETAT_INITIAL: EtatRecuperation = {}

export function Nouveau({ perime }: { perime: boolean }) {
  const { langue, d } = useLangue()
  const t = d.recuperation
  const [etat, action, enCours] = useActionState(poserLeMotDePasse, ETAT_INITIAL)

  return (
    <>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="langue" value={langue} />

        <Champ
          label={t.motDePasse}
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          aide={d.inscriptionRole.aideMotDePasse}
          required
        />

        <Message
          erreur={perime ? t.lienExpire : etat.erreur}
          info={etat.info}
        />

        <Bouton enCours={enCours}>{t.poser}</Bouton>
      </form>

      <Link
        href={chemin(langue, "/connexion")}
        className="doux text-sm underline underline-offset-4"
      >
        {t.retourConnexion}
      </Link>
    </>
  )
}
