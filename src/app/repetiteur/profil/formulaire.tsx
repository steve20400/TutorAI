"use client"

import { useActionState } from "react"
import {
  enregistrerProfil,
  MATIERES,
  NIVEAUX,
  type EtatProfil,
} from "../actions"

const ETAT_INITIAL: EtatProfil = {}

type Valeurs = {
  bio: string
  ville: string
  matieres: string[]
  niveaux: string[]
  tarif_mensuel: number | null
  annees_experience: number | null
  disponibilites_texte: string
}

export function FormulaireProfil({ valeurs }: { valeurs: Valeurs }) {
  const [etat, action, enCours] = useActionState(
    enregistrerProfil,
    ETAT_INITIAL,
  )

  return (
    <form action={action} className="flex flex-col gap-6">
      <Section titre="Ce que vous enseignez">
        <Cases
          nom="matieres"
          options={[...MATIERES]}
          cochees={valeurs.matieres}
        />
      </Section>

      <Section titre="À quels niveaux">
        <Cases nom="niveaux" options={[...NIVEAUX]} cochees={valeurs.niveaux} />
      </Section>

      <Section titre="Vous présenter">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Quelques lignes</span>
          <textarea
            name="bio"
            rows={4}
            defaultValue={valeurs.bio}
            placeholder="Votre parcours, votre façon de travailler avec un élève…"
            className="champ px-3 py-2.5"
          />
          <span className="doux text-xs">
            C&apos;est souvent le seul texte qu&apos;un parent lit en entier.
          </span>
        </label>

        <Champ
          label="Ville"
          name="ville"
          defaultValue={valeurs.ville}
          placeholder="Yaoundé"
        />
      </Section>

      <Section titre="Conditions">
        <Champ
          label="Tarif mensuel (FCFA)"
          name="tarif_mensuel"
          type="number"
          min={0}
          step={1000}
          defaultValue={valeurs.tarif_mensuel ?? ""}
          placeholder="45000"
        />
        <Champ
          label="Années d'expérience"
          name="annees_experience"
          type="number"
          min={0}
          max={60}
          defaultValue={valeurs.annees_experience ?? ""}
        />
        <Champ
          label="Disponibilités"
          name="disponibilites_texte"
          defaultValue={valeurs.disponibilites_texte}
          placeholder="En semaine après 17h, samedi matin"
        />
      </Section>

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

      <button
        type="submit"
        disabled={enCours}
        className="bouton px-4 py-3 text-base"
      >
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>

      <p className="doux text-center text-xs leading-relaxed">
        L&apos;envoi des pièces justificatives — identité, casier judiciaire,
        diplômes — viendra à l&apos;étape suivante.
      </p>
    </form>
  )
}

function Section({
  titre,
  children,
}: {
  titre: string
  children: React.ReactNode
}) {
  return (
    <section className="carte flex flex-col gap-4 p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
        {titre}
      </h2>
      {children}
    </section>
  )
}

/** Cases à cocher présentées comme des pastilles : plus faciles au pouce. */
function Cases({
  nom,
  options,
  cochees,
}: {
  nom: string
  options: string[]
  cochees: string[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input
            type="checkbox"
            name={nom}
            value={o}
            defaultChecked={cochees.includes(o)}
            className="peer sr-only"
          />
          <span className="pastille">{o}</span>
        </label>
      ))}
    </div>
  )
}

function Champ({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input {...props} className="champ px-3 py-2.5" />
    </label>
  )
}
