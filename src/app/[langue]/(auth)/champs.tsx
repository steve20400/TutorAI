"use client"

import { useLangue } from "@/langues/contexte"

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
  return (
    <div className="flex flex-col gap-1.5">
      <label className="champ-flottant">
        <input {...props} placeholder=" " />
        <span>{label}</span>
      </label>
      {aide ? <span className="doux px-1 text-xs">{aide}</span> : null}
    </div>
  )
}

export function Bouton({
  enCours,
  children,
}: {
  enCours: boolean
  children: React.ReactNode
}) {
  const { d } = useLangue()

  return (
    <button
      type="submit"
      disabled={enCours}
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
