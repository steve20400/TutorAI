"use client"

import { useActionState } from "react"

import { creerEnfant, type EtatEnfant } from "@/actions/famille"
import { remplir, type Dictionnaire, type Langue } from "@/langues"

const ETAT_INITIAL: EtatEnfant = {}

export type Enfant = {
  id: string
  prenom: string | null
  nom: string | null
  identifiant: string | null
  /**
   * Vrai pendant les quarante-huit heures qui suivent une reconnaissance.
   *
   * Sans cette mention, l'adulte verrait le prénom de l'enfant et rien
   * d'autre — ni séances, ni travail — et croirait à une panne. On lui dit
   * pourquoi, et jusqu'à quand.
   */
  provisoire?: boolean
  actif_le?: string | null
}

/**
 * Les enfants rattachés, et le formulaire qui en ajoute un.
 *
 * L'identifiant est affiché en gros après la création, une seule fois : c'est
 * la seule chose que le parent doit retenir, et il n'y a pas d'adresse mail
 * pour le lui rappeler plus tard. Il reste visible dans la liste, ce qui rend
 * l'oubli sans conséquence.
 */
export function Enfants({
  langue,
  d,
  enfants,
  serviceMuet = false,
}: {
  langue: Langue
  d: Dictionnaire
  enfants: Enfant[]
  /** Le service Tuteurs n'a pas répondu. Différent de « aucun enfant ». */
  serviceMuet?: boolean
}) {
  const [etat, action, enCours] = useActionState(creerEnfant, ETAT_INITIAL)
  const t = d.parent

  return (
    <section className="carte p-5">
      <div className="font-medium">{t.mesEnfants}</div>

      {serviceMuet ? (
        // Ne jamais afficher « aucun enfant » quand on n'a pas pu demander :
        // un parent qui lit ça croit que son enfant a disparu.
        <p className="doux mt-1 text-sm leading-relaxed">{t.serviceMuet}</p>
      ) : enfants.length === 0 ? (
        <p className="doux mt-1 text-sm leading-relaxed">{t.aucunEnfant}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {enfants.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-sm"
              style={{ borderColor: "var(--bordure)" }}
            >
              <span className="font-medium">
                {[e.prenom, e.nom].filter(Boolean).join(" ")}
              </span>
              <span className="flex flex-wrap items-baseline gap-2">
                {e.provisoire ? (
                  <span className="badge-eteint text-[10px]">
                    {t.lienProvisoire}
                  </span>
                ) : null}
                <span className="doux font-mono text-xs">
                  {t.identifiantDe} : {e.identifiant}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {etat.cree ? (
        <p
          className="mt-4 rounded-[9px] p-3 text-sm leading-relaxed"
          style={{
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            border: "1px solid var(--bordure)",
          }}
        >
          {remplir(t.enfantCree, {
            prenom: etat.cree.prenom,
            identifiant: etat.cree.identifiant,
          })}
        </p>
      ) : null}

      <form action={action} className="mt-4 flex flex-col gap-2.5">
        <input type="hidden" name="langue" value={langue} />

        <div className="flex flex-wrap gap-2.5">
          <input
            name="prenom"
            required
            placeholder={t.prenomEnfant}
            className="champ min-w-[140px] flex-1 px-3 py-2 text-sm"
          />
          <input
            name="nom"
            placeholder={t.nomEnfant}
            className="champ min-w-[140px] flex-1 px-3 py-2 text-sm"
          />
        </div>

        <input
          name="motDePasse"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder={t.motDePasseEnfant}
          className="champ px-3 py-2 text-sm"
        />
        <p className="doux text-xs leading-relaxed">{t.motDePasseAide}</p>

        {etat.erreur ? (
          <p className="text-sm" style={{ color: "var(--erreur-texte)" }}>
            {etat.erreur}
          </p>
        ) : null}

        <button type="submit" className="bt1 mt-1" disabled={enCours}>
          {t.creerLeCompte}
        </button>

        <p className="doux text-xs leading-relaxed">{t.pasDEmail}</p>
      </form>
    </section>
  )
}
