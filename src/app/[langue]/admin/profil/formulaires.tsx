"use client"

import { useActionState, useState } from "react"

import {
  changerMotDePasse,
  enregistrerCompte,
  type EtatCompte,
} from "@/actions/compte"
import { PhotoProfil } from "@/composants/photo-profil"
import { EntreeMotDePasse } from "@/composants/mot-de-passe"
import type { Dictionnaire, Langue } from "@/langues"

const VIDE: EtatCompte = {}

export type Compte = {
  id: string
  prenom: string | null
  nom: string | null
  role: string
  identifiant: string | null
  telephone: string | null
  photo_url: string | null
}

/**
 * Son propre compte.
 *
 * Deux formulaires séparés et non un seul : changer son prénom et changer son
 * mot de passe n'engagent pas la même chose, et les mêler ferait redemander le
 * mot de passe actuel pour corriger une faute de frappe dans un nom.
 */
export function FormulairesCompte({
  langue,
  d,
  compte,
  adresse,
}: {
  langue: Langue
  d: Dictionnaire
  compte: Compte
  /** Adresse de connexion, lue à part : elle ne vit pas dans `profils`. */
  adresse: string | null
}) {
  const t = d.adminPages.profil
  const [photo, poserPhoto] = useState<string | null>(compte.photo_url)
  const [etatIdentite, actionIdentite, identiteEnCours] = useActionState(
    enregistrerCompte,
    VIDE,
  )
  const [etatMdp, actionMdp, mdpEnCours] = useActionState(
    changerMotDePasse,
    VIDE,
  )

  const message = (etat: EtatCompte, succes: string) => {
    if (etat.erreur === "court") return { texte: t.motDePasseAide, mauvais: true }
    if (etat.erreur === "service")
      return { texte: d.erreurs.generique, mauvais: true }
    if (etat.erreur) return { texte: etat.erreur, mauvais: true }
    if (etat.info) return { texte: succes, mauvais: false }
    return null
  }

  const msgIdentite = message(etatIdentite, t.enregistre)
  const msgMdp = message(etatMdp, t.motDePasseChange)

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section className="carte p-5">
        <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
          {t.identite}
        </div>

        <form action={actionIdentite} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="langue" value={langue} />

          {/* Le champ reste, caché : c'est lui qui part avec le formulaire.
              Le téléversement ne fait qu'y déposer l'adresse obtenue. */}
          <input type="hidden" name="photo_url" value={photo ?? ""} />

          <PhotoProfil
            nom={[compte.prenom, compte.nom].filter(Boolean).join(" ")}
            photoUrl={photo}
            compteId={compte.id}
            surChangement={poserPhoto}
          />

          <div className="flex flex-wrap gap-3">
            <label className="min-w-[150px] flex-1">
              <span className="doux block text-[11.5px]">{t.prenom}</span>
              <input
                name="prenom"
                required
                defaultValue={compte.prenom ?? ""}
                className="champ mt-1 w-full px-3 py-2 text-[13px]"
              />
            </label>
            <label className="min-w-[150px] flex-1">
              <span className="doux block text-[11.5px]">{t.nom}</span>
              <input
                name="nom"
                defaultValue={compte.nom ?? ""}
                className="champ mt-1 w-full px-3 py-2 text-[13px]"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="min-w-[150px] flex-1">
              <span className="doux block text-[11.5px]">{t.telephone}</span>
              <input
                name="telephone"
                defaultValue={compte.telephone ?? ""}
                className="champ mt-1 w-full px-3 py-2 text-[13px]"
              />
            </label>
            <label className="min-w-[150px] flex-1">
              <span className="doux block text-[11.5px]">{t.identifiant}</span>
              <input
                name="identifiant"
                defaultValue={compte.identifiant ?? ""}
                className="champ mt-1 w-full px-3 py-2 font-mono text-[13px]"
              />
            </label>
          </div>
          <p className="doux text-[11.5px] leading-relaxed">
            {t.identifiantAide}
          </p>

          {adresse ? (
            <p className="doux text-[11.5px] leading-relaxed">
              {t.adresse} : <b>{adresse}</b> — {t.adresseAide}
            </p>
          ) : null}

          {msgIdentite ? (
            <p
              className="text-[12.5px]"
              style={{
                color: msgIdentite.mauvais
                  ? "var(--erreur-texte)"
                  : "var(--accent-doux-texte)",
              }}
            >
              {msgIdentite.texte}
            </p>
          ) : null}

          <button
            type="submit"
            className="bt1 self-start"
            disabled={identiteEnCours}
          >
            {t.enregistrer}
          </button>
        </form>
      </section>

      <section className="carte p-5">
        <div className="doux text-[10px] font-semibold uppercase tracking-[0.14em]">
          {t.motDePasse}
        </div>

        <form action={actionMdp} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="langue" value={langue} />

          <div className="flex flex-wrap gap-3">
            <label className="min-w-[170px] flex-1">
              <span className="doux block text-[11.5px]">
                {t.motDePasseActuel}
              </span>
              <EntreeMotDePasse
                name="actuel"
                required
                autoComplete="current-password"
                className="champ mt-1 w-full px-3 py-2 text-[13px]"
              />
            </label>
            <label className="min-w-[170px] flex-1">
              <span className="doux block text-[11.5px]">
                {t.motDePasseNouveau}
              </span>
              <EntreeMotDePasse
                name="nouveau"
                required
                minLength={8}
                autoComplete="new-password"
                className="champ mt-1 w-full px-3 py-2 text-[13px]"
              />
            </label>
          </div>

          <p className="doux text-[11.5px] leading-relaxed">
            {t.motDePasseAide}
          </p>

          {msgMdp ? (
            <p
              className="text-[12.5px]"
              style={{
                color: msgMdp.mauvais
                  ? "var(--erreur-texte)"
                  : "var(--accent-doux-texte)",
              }}
            >
              {msgMdp.texte}
            </p>
          ) : null}

          <button type="submit" className="bt2 self-start" disabled={mdpEnCours}>
            {t.changerMotDePasse}
          </button>
        </form>
      </section>
    </div>
  )
}
