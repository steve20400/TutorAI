"use client"

import { useActionState, useState } from "react"

import { Avatar } from "@/composants/avatar"
import { couperRattachement, type EtatDetachement } from "@/actions/famille"
import { remplir, type Dictionnaire, type Langue } from "@/langues"

export type AdulteRattache = {
  id: string
  prenom: string | null
  photo_url: string | null
  porte: boolean
  fournit: boolean
  provisoire: boolean
}

const INITIAL: EtatDetachement = {}

/**
 * Les adultes rattachés à cet enfant, et le moyen d'en retirer un.
 *
 * Voir la liste ne suffisait pas. Un enfant qui reconnaît, dans cet écran, un
 * adulte qu'il n'aurait pas dû accepter — un prénom qui ressemblait à celui
 * d'une tante — doit pouvoir le retirer lui-même. Le lui montrer sans lui
 * donner la sortie, c'est lui apprendre qu'il est coincé.
 *
 * Ni adresse ni téléphone, comme partout ailleurs : cet écran ne doit pas
 * devenir un moyen d'apprendre comment joindre un adulte hors d'ici.
 */
export function MesAdultes({
  adultes,
  payeur,
  langue,
  d,
}: {
  adultes: AdulteRattache[]
  payeur: string | null
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.compte

  return (
    <>
      <ul className="mt-3 flex flex-col gap-2">
        {adultes.map((a) => (
          <Ligne
            key={a.id}
            adulte={a}
            paie={payeur === a.id}
            dernier={adultes.length === 1}
            langue={langue}
            d={d}
          />
        ))}
      </ul>
      <p className="doux mt-3 text-[11.5px] leading-relaxed">
        {t.mesAdultesDetail}
      </p>
    </>
  )
}

function Ligne({
  adulte,
  paie,
  dernier,
  langue,
  d,
}: {
  adulte: AdulteRattache
  paie: boolean
  dernier: boolean
  langue: Langue
  d: Dictionnaire
}) {
  const t = d.compte
  const [demande, setDemande] = useState(false)
  const [etat, action, enCours] = useActionState(couperRattachement, INITIAL)
  const nom = adulte.prenom ?? "?"

  return (
    <li className="flex flex-wrap items-center gap-2.5">
      <Avatar nom={nom} photoUrl={adulte.photo_url} taille={30} />
      <span className="flex-1 text-sm">{adulte.prenom}</span>

      {adulte.provisoire ? (
        <span className="badge-eteint text-[10px]">{t.mesAdultesProvisoire}</span>
      ) : paie ? (
        <span className="doux text-[10.5px]">{t.mesAdultesPaie}</span>
      ) : null}

      {!demande ? (
        <button
          type="button"
          onClick={() => setDemande(true)}
          className="doux text-xs underline underline-offset-4"
        >
          {t.couper}
        </button>
      ) : (
        <form action={action} className="basis-full">
          <input type="hidden" name="langue" value={langue} />
          <input type="hidden" name="adulte" value={adulte.id} />

          <div
            className="mt-1 rounded-[9px] p-3"
            style={{
              background: "color-mix(in srgb, var(--texte) 5%, var(--fond))",
            }}
          >
            <p className="text-xs leading-relaxed">
              {remplir(t.couperConfirme, { nom })}
            </p>

            {/* Le cas qui mérite d'être dit avant, pas après. */}
            {dernier ? (
              <p
                className="mt-2 text-xs leading-relaxed"
                style={{ color: "var(--erreur-texte)" }}
              >
                {t.couperDernier}
              </p>
            ) : null}

            {etat.erreur ? (
              <p className="mt-2 text-xs" style={{ color: "var(--erreur-texte)" }}>
                {etat.erreur}
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={enCours}
                className="bt3 px-3 py-1.5 text-xs"
              >
                {enCours ? d.commun.enCours : t.couperOui}
              </button>
              <button
                type="button"
                onClick={() => setDemande(false)}
                className="doux text-xs underline underline-offset-4"
              >
                {t.couperNon}
              </button>
            </div>
          </div>
        </form>
      )}
    </li>
  )
}
