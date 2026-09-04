"use client"

/** Petits composants de formulaire partagés par connexion et inscription. */

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
      <input
        {...props}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-base outline-none transition focus:border-amber-600/60 focus:ring-2 focus:ring-amber-600/20 dark:border-white/20"
      />
      {aide ? <span className="text-xs opacity-60">{aide}</span> : null}
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
    <button
      type="submit"
      disabled={enCours}
      className="mt-1 rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white transition hover:bg-amber-800 disabled:opacity-50"
    >
      {enCours ? "Un instant…" : children}
    </button>
  )
}

export function Message({ erreur, info }: { erreur?: string; info?: string }) {
  if (!erreur && !info) return null
  return (
    <p
      role="status"
      className={
        erreur
          ? "rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
          : "rounded-lg bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
      }
    >
      {erreur ?? info}
    </p>
  )
}
