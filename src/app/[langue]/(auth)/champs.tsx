"use client"

import { useLangue } from "@/langues/contexte"
import { BoutonVoir, useVisibilite } from "@/composants/mot-de-passe"

/**
 * Composants de formulaire partagés par connexion et inscription.
 *
 * Ils passent par les classes de globals.css plutôt que par des couleurs
 * Tailwind écrites en dur : sinon le thème choisi par l'utilisateur s'arrête
 * à la bordure des formulaires.
 */

/**
 * Champ à étiquette flottante.
 *
 * `placeholder=" "` n'est pas une coquille : c'est lui qui rend
 * `:placeholder-shown` utilisable pour savoir si le champ est vide, sans une
 * ligne de JavaScript. Le retirer ferait rester l'étiquette en bas, par-dessus
 * ce que la personne saisit.
 */
export function Champ({
  label,
  aide,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  aide?: string
}) {
  const { visible, basculer, type } = useVisibilite()
  const motDePasse = props.type === "password"

  return (
    <div className="flex flex-col gap-1.5">
      {/* Le bouton est hors du <label> mais dans un parent positionné : à
          l'intérieur, tout clic dessus rendrait aussi le focus au champ, et
          un bouton dans une étiquette se lit mal aux lecteurs d'écran.

          L'ordre input → span est intouchable : c'est `input + span` qui
          fait monter l'étiquette flottante. Un élément glissé entre les deux
          la laisserait par-dessus ce qu'on saisit. */}
      <div className="relative">
        <label className="champ-flottant">
          <input
            {...props}
            type={motDePasse ? type : props.type}
            className={motDePasse ? "avec-bascule" : undefined}
            placeholder=" "
          />
          <span>{label}</span>
        </label>
        {motDePasse ? (
          <BoutonVoir visible={visible} basculer={basculer} />
        ) : null}
      </div>
      {aide ? <span className="doux px-1 text-xs">{aide}</span> : null}
    </div>
  )
}

export function Bouton({
  enCours,
  desactive = false,
  children,
}: {
  enCours: boolean
  /** Indisponible pour une autre raison qu'un envoi en cours. */
  desactive?: boolean
  children: React.ReactNode
}) {
  const { d } = useLangue()

  return (
    <button
      type="submit"
      disabled={enCours || desactive}
      className="bouton mt-1 w-full px-4 py-3.5 text-[15px]"
    >
      {enCours ? d.commun.enCours : children}
    </button>
  )
}

export function Message({ erreur, info }: { erreur?: string; info?: string }) {
  if (!erreur && !info) return null

  // Rouge et vert gardent leur sens dans les quatre thèmes : ce sont les deux
  // couleurs qu'on lit sans les lire, elles ne doivent jamais changer de rôle.
  return (
    <p
      role="status"
      className="rounded-lg px-3.5 py-2.5 text-sm"
      style={
        erreur
          ? { background: "rgb(220 38 38 / 0.10)", color: "var(--erreur-texte)" }
          : {
              background: "var(--accent-doux)",
              color: "var(--accent-doux-texte)",
            }
      }
    >
      {erreur ?? info}
    </p>
  )
}
