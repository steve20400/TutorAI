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

  // Une fois le mot de passe posé, le formulaire disparaît.
  //
  // Il restait à l'écran et restait soumettable : on pouvait le réenregistrer
  // dix fois de suite. Rien de dangereux — la session est ouverte, et
  // quiconque est connecté peut changer son mot de passe — mais l'écran
  // laissait croire que le lien du courriel servait encore, alors qu'il était
  // consommé depuis longtemps. Un état final lève le doute.
  if (etat.info) {
    return (
      <div className="flex flex-col gap-3">
        <p
          className="rounded-[10px] px-3.5 py-3 text-[13px] leading-relaxed"
          style={{
            background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
          }}
        >
          {etat.info}
        </p>
        <p className="doux px-1 text-xs leading-relaxed">
          {t.changeAutresSessions}
        </p>
        <Link
          href={chemin(langue, "/")}
          className="bouton mt-1 w-full px-4 py-3.5 text-center text-[15px]"
        >
          {t.continuer}
        </Link>
      </div>
    )
  }

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

        <Message erreur={perime ? t.lienExpire : etat.erreur} />

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
