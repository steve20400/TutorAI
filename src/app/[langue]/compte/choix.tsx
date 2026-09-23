"use client"

import { useActionState, useState } from "react"

import { enregistrerCompte, type EtatCompte } from "@/actions/compte"
import { Avatar } from "@/composants/avatar"
import type { Dictionnaire, Langue } from "@/langues"
import type { Avatar as AvatarChoisi } from "@/lib/avatars"

const VIDE: EtatCompte = {}

/**
 * Le compte d'un élève : son prénom, et l'image qu'il se choisit.
 *
 * Pas de photo. La règle est tenue en base par un déclencheur, mais l'écran ne
 * doit pas non plus proposer ce qu'on refuse ensuite : offrir un champ « photo »
 * puis rejeter la valeur serait une façon compliquée de dire non.
 */
export function ChoixCompte({
  langue,
  d,
  prenom,
  nom,
  identifiant,
  photoUrl,
  avatars,
}: {
  langue: Langue
  d: Dictionnaire
  prenom: string | null
  nom: string | null
  identifiant: string | null
  photoUrl: string | null
  avatars: AvatarChoisi[]
}) {
  const t = d.compte
  const [etat, action, enCours] = useActionState(enregistrerCompte, VIDE)
  const [choisi, poserChoisi] = useState<string>(photoUrl ?? "")

  const nomComplet = [prenom, nom].filter(Boolean).join(" ")

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="langue" value={langue} />
      <input type="hidden" name="photo_url" value={choisi} />

      <div className="flex items-center gap-4">
        <Avatar nom={nomComplet} photoUrl={choisi || null} taille={64} />
        <div className="min-w-0">
          <p className="text-[15px] font-medium">{nomComplet || "—"}</p>
          {identifiant ? (
            <p className="doux font-mono text-[11.5px]">{identifiant}</p>
          ) : null}
        </div>
      </div>

      <label className="flex flex-col">
        <span className="doux text-[11.5px]">{t.prenom}</span>
        <input
          name="prenom"
          required
          defaultValue={prenom ?? ""}
          className="champ mt-1 px-3 py-2 text-[14px]"
        />
      </label>

      <label className="flex flex-col">
        <span className="doux text-[11.5px]">{t.nom}</span>
        <input
          name="nom"
          defaultValue={nom ?? ""}
          className="champ mt-1 px-3 py-2 text-[14px]"
        />
      </label>

      <div>
        <p className="text-[13.5px] font-medium">{t.avatar}</p>
        <p className="doux mt-0.5 text-[12px] leading-relaxed">{t.avatarAide}</p>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {/* Garder ses initiales est un choix, pas un défaut : c'est la
              première case, et elle se sélectionne comme les autres. */}
          <button
            type="button"
            onClick={() => poserChoisi("")}
            aria-pressed={choisi === ""}
            title={t.sansAvatar}
            className="rounded-full p-[3px] transition"
            style={{
              outline: choisi === "" ? "2px solid var(--accent)" : "none",
              outlineOffset: 2,
            }}
          >
            <Avatar nom={nomComplet} photoUrl={null} taille={44} />
          </button>

          {avatars.map((a) => {
            const valeur = `avatar:${a.cle}`
            return (
              <button
                key={a.cle}
                type="button"
                onClick={() => poserChoisi(valeur)}
                aria-pressed={choisi === valeur}
                className="rounded-full p-[3px] transition"
                style={{
                  outline:
                    choisi === valeur ? "2px solid var(--accent)" : "none",
                  outlineOffset: 2,
                }}
              >
                <Avatar nom={nomComplet} photoUrl={valeur} taille={44} />
              </button>
            )
          })}
        </div>
      </div>

      {etat.info ? (
        <p
          className="text-[13px]"
          style={{ color: "var(--accent-doux-texte)" }}
        >
          {t.enregistre}
        </p>
      ) : null}
      {etat.erreur ? (
        <p className="text-[13px]" style={{ color: "var(--erreur-texte)" }}>
          {etat.erreur === "service" ? d.erreurs.generique : etat.erreur}
        </p>
      ) : null}

      <button type="submit" className="bt1 self-start" disabled={enCours}>
        {t.enregistrer}
      </button>
    </form>
  )
}
