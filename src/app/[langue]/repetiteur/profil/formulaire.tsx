"use client"

import { useActionState } from "react"

import { useLangue } from "@/langues/contexte"
import { Message } from "../../(auth)/champs"
import { enregistrerProfil, type EtatProfil } from "@/actions/repetiteur"
import { MATIERES, NIVEAUX } from "@/lib/referentiel"

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
  const { langue, d } = useLangue()
  const [etat, action, enCours] = useActionState(
    enregistrerProfil,
    ETAT_INITIAL,
  )

  const f = d.repetiteurFormulaire

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="langue" value={langue} />

      <Section titre={f.ceQueVousEnseignez}>
        <Cases
          nom="matieres"
          options={[...MATIERES]}
          etiquettes={d.matieres}
          cochees={valeurs.matieres}
        />
      </Section>

      <Section titre={f.aQuelsNiveaux}>
        <Cases
          nom="niveaux"
          options={[...NIVEAUX]}
          etiquettes={d.niveaux}
          cochees={valeurs.niveaux}
        />
      </Section>

      <Section titre={f.vousPresenter}>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{f.quelquesLignes}</span>
          <textarea
            name="bio"
            rows={4}
            defaultValue={valeurs.bio}
            placeholder={f.bioPlaceholder}
            className="champ px-3 py-2.5"
          />
          <span className="doux text-xs">{f.bioAide}</span>
        </label>

        <Champ
          label={f.ville}
          name="ville"
          defaultValue={valeurs.ville}
          placeholder={f.villePlaceholder}
        />
      </Section>

      <Section titre={f.conditions}>
        <Champ
          label={f.tarif}
          name="tarif_mensuel"
          type="number"
          min={0}
          step={1000}
          defaultValue={valeurs.tarif_mensuel ?? ""}
          placeholder="45000"
        />
        <Champ
          label={f.experience}
          name="annees_experience"
          type="number"
          min={0}
          max={60}
          defaultValue={valeurs.annees_experience ?? ""}
        />
        <Champ
          label={f.disponibilites}
          name="disponibilites_texte"
          defaultValue={valeurs.disponibilites_texte}
          placeholder={f.disponibilitesPlaceholder}
        />
      </Section>

      <Message erreur={etat.erreur} info={etat.info} />

      <button
        type="submit"
        disabled={enCours}
        className="bouton px-4 py-3 text-base"
      >
        {enCours ? f.enregistrement : f.enregistrer}
      </button>

      <p className="doux text-center text-xs leading-relaxed">{f.pieces}</p>
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

/**
 * Cases à cocher présentées comme des pastilles : plus faciles au pouce.
 *
 * `value` reste la valeur française stockée en base ; seule l'étiquette
 * affichée change de langue. Traduire la valeur couperait les fiches déjà
 * enregistrées de l'annuaire.
 */
function Cases({
  nom,
  options,
  etiquettes,
  cochees,
}: {
  nom: string
  options: string[]
  etiquettes: Record<string, string>
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
          <span className="pastille">{etiquettes[o] ?? o}</span>
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
