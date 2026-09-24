"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import { chemin, dictionnaire, remplir, type Langue } from "@/langues"
import {
  marquerLue,
  traiterSignalement,
  type EtatTraitement,
} from "@/actions/signalement"
import { Message } from "../../(auth)/champs"

type Personne = {
  id: string
  prenom: string | null
  nom: string | null
  identifiant: string | null
  role: string
}

export type Signalement = {
  id: string
  motif: string
  statut: string
  decision: string | null
  lu_le: string | null
  traite_le: string | null
  cree_le: string
  seance_id: string | null
  auteur: Personne | null
  cible: Personne | null
}

const ETAT_INITIAL: EtatTraitement = {}

const nomDe = (p: Personne | null) =>
  p ? [p.prenom, p.nom].filter(Boolean).join(" ") || p.identifiant || "—" : null

/**
 * Les signalements, le plus récent d'abord.
 *
 * Le motif est affiché en entier, jamais tronqué : c'est le texte de quelqu'un
 * qui a pris la peine d'alerter, et une phrase coupée au milieu peut changer
 * de sens.
 */
export function Liste({
  langue,
  signalements,
}: {
  langue: Langue
  signalements: Signalement[]
}) {
  const d = dictionnaire(langue)
  const t = d.adminPages.signalements

  return (
    <div className="mt-5 flex flex-col gap-3">
      {signalements.map((s) => (
        <Carte key={s.id} langue={langue} s={s} t={t} commun={d.commun} />
      ))}
    </div>
  )
}

function Carte({
  langue,
  s,
  t,
  commun,
}: {
  langue: Langue
  s: Signalement
  t: ReturnType<typeof dictionnaire>["adminPages"]["signalements"]
  commun: ReturnType<typeof dictionnaire>["commun"]
}) {
  const [etat, action, enCours] = useActionState(
    traiterSignalement,
    ETAT_INITIAL,
  )
  const [ouvert, setOuvert] = useState(false)

  const quand = new Date(s.cree_le).toLocaleString(langue, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  const auteur = nomDe(s.auteur)
  const cible = nomDe(s.cible)

  return (
    <section
      className="carte p-4"
      style={
        s.statut === "nouveau"
          ? { borderColor: "var(--erreur-texte)" }
          : undefined
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="doux text-[11.5px]">
          {/* Sans auteur, c'est la plateforme qui a signalé d'elle-même — au
              dixième rattachement refusé, par exemple. On le dit, parce que
              « personne » se lirait comme une erreur. */}
          {auteur ? remplir(t.par, { nom: auteur }) : t.parLaPlateforme} · {quand}
        </span>
        <span
          className={s.statut === "nouveau" ? "badge-eteint" : "badge-actif"}
        >
          {s.statut === "nouveau"
            ? t.nouveau
            : s.statut === "lu"
              ? t.lu
              : t.traite}
        </span>
      </div>

      {/* Le nom mène au dossier.

          Une alerte qui nomme quelqu'un sans permettre de l'atteindre oblige
          à le chercher dans une autre rubrique, en retenant son nom. C'est
          exactement le moment où l'on renonce — et c'est le moment où il ne
          faut pas.

          Un répétiteur a son dossier de vérification, un adulte sa fiche de
          famille : ce ne sont pas les mêmes écrans, et c'est là qu'on peut
          suspendre le compte. */}
      {cible ? (
        <div className="mt-1.5 text-[13.5px] font-medium">
          {s.cible ? (
            <Link
              href={chemin(
                langue,
                s.cible.role === "repetiteur"
                  ? `/admin/dossiers/${s.cible.id}`
                  : `/admin/familles/${s.cible.id}`,
              )}
              className="underline underline-offset-4"
            >
              {remplir(t.vise, { nom: cible })}
            </Link>
          ) : (
            remplir(t.vise, { nom: cible })
          )}
        </div>
      ) : null}

      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">
        {s.motif}
      </p>

      {s.decision ? (
        <div
          className="mt-3 rounded-[8px] px-3 py-2 text-[12.5px] leading-relaxed"
          style={{ background: "color-mix(in srgb, var(--texte) 5%, var(--fond))" }}
        >
          <span className="doux">{t.decision} : </span>
          {s.decision}
        </div>
      ) : null}

      {s.lu_le && s.statut !== "nouveau" ? (
        <div className="doux mt-2 text-[11.5px]">
          {remplir(t.lueLe, {
            date: new Date(s.lu_le).toLocaleString(langue, {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </div>
      ) : null}

      {s.statut !== "traite" ? (
        ouvert ? (
          <form action={action} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="langue" value={langue} />
            <input type="hidden" name="signalement" value={s.id} />

            <label className="flex flex-col gap-1">
              <span className="doux text-[11.5px]">{t.decisionAide}</span>
              <textarea
                name="decision"
                rows={2}
                required
                minLength={3}
                placeholder={t.decisionExemple}
                className="champ px-3 py-2 text-[13px]"
              />
            </label>

            <Message erreur={etat.erreur} info={etat.info} />

            <div className="flex gap-2">
              <button type="submit" disabled={enCours} className="bt1 px-4 py-2">
                {enCours ? commun.enCours : t.classer}
              </button>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="bt2 px-4 py-2"
              >
                {commun.fermerLaPhoto}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Un clic, sans rien écrire.

                Lire n'est pas décider. Exiger un paragraphe pour dire « rien
                à signaler » ferait qu'on ne les lit plus du tout — et la
                friction chasserait la lecture, ce qui est le contraire du
                but. */}
            {s.statut === "nouveau" ? (
              <form action={marquerLue}>
                <input type="hidden" name="langue" value={langue} />
                <input type="hidden" name="signalement" value={s.id} />
                <button type="submit" className="bt1 px-4 py-2">
                  {t.marquerLue}
                </button>
              </form>
            ) : null}

            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="bt2 px-4 py-2"
            >
              {t.classer}
            </button>
          </div>
        )
      ) : null}
    </section>
  )
}
