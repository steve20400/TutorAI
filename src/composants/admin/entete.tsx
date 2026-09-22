/**
 * En-tête de page de l'administration.
 *
 * Le titre n'est pas le nom de la rubrique mais ce que la page raconte
 * aujourd'hui : « Trois attendent votre cachet. » plutôt que « Dossiers ».
 * Le nom de la rubrique reste au-dessus, en petites capitales — il sert à se
 * repérer, pas à informer.
 */
export function EnteteAdmin({
  etiquette,
  titre,
  children,
}: {
  etiquette: string
  titre: string
  /** Actions alignées à droite du titre. */
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-7 pb-5 pt-7">
      <div className="min-w-0">
        <div className="doux text-[11px] font-semibold uppercase tracking-[0.16em]">
          {etiquette}
        </div>
        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.01em]">
          {titre}
        </h1>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  )
}

/**
 * État vide.
 *
 * Il y en aura beaucoup au lancement : ni répétiteur, ni famille, ni séance.
 * Un écran vide qui explique ce qui le remplira vaut mieux qu'un écran vide
 * qui laisse croire à une panne.
 */
export function RienEncore({
  titre,
  detail,
}: {
  titre: string
  detail?: string
}) {
  return (
    <div className="mx-7 mb-7 flex flex-col items-center justify-center rounded-xl border border-dashed px-8 py-14 text-center"
         style={{ borderColor: "var(--bordure)" }}>
      <p className="text-[15px] font-medium">{titre}</p>
      {detail ? (
        <p className="doux mt-2 max-w-md text-[13px] leading-relaxed">{detail}</p>
      ) : null}
    </div>
  )
}
