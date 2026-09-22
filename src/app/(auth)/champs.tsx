"use client"

/**
 * Petits composants de formulaire partagés par connexion et inscription.
 *
 * Ils passent par les classes de globals.css (.champ, .bouton) plutôt que par
 * des couleurs Tailwind écrites en dur : sinon le thème choisi par
 * l'utilisateur s'arrête à la bordure des formulaires, et le bouton reste
 * ambre dans une page indigo.
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
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input {...props} className="champ px-3 py-2.5 outline-none transition" />
      {aide ? <span className="doux text-xs">{aide}</span> : null}
    </label>
  )
}

export function Bouton({
  enCours,
  children,
}: {
  enCours: boolean
  children: React.ReactNode
}) {
  return (
    <button type="submit" disabled={enCours} className="bouton mt-1 px-4 py-2.5">
      {enCours ? "Un instant…" : children}
    </button>
  )
}

export function Message({ erreur, info }: { erreur?: string; info?: string }) {
  if (!erreur && !info) return null

  // L'erreur et la confirmation gardent leurs couleurs propres dans les quatre
  // thèmes : rouge et vert ne doivent jamais changer de sens d'un écran à
  // l'autre, c'est ce qui permet de les lire sans les lire.
  return (
    <p
      role="status"
      className="rounded-lg px-3 py-2 text-sm"
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
