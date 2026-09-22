import { Logo } from "@/app/marque"
import { BasculeMode } from "@/app/theme"

/**
 * Les trois mots que le produit doit planter dans la tête d'un parent.
 *
 * Ils occupent la colonne de gauche sur grand écran, où il y a de la place
 * pour eux, et disparaissent sur téléphone où la seule chose qui compte est
 * d'entrer dans l'application.
 */
const PROMESSES = [
  {
    mot: "Vérifiés",
    detail: "Pièce d'identité et casier contrôlés avant la première séance.",
  },
  {
    mot: "Enregistrés",
    detail: "Chaque cours laisse une trace, que le parent peut consulter.",
  },
  {
    mot: "Suivis",
    detail: "Le travail de l'enfant se lit, séance après séance.",
  },
] as const

/**
 * Cadre commun aux écrans d'authentification.
 *
 * Le motif couvre toute la page, sans carte ni barre de séparation : dès lors
 * que le fond est occupé d'un bout à l'autre, il n'y a plus rien à séparer.
 * C'est la règle qui a fait tomber les six premières propositions de design.
 *
 * Sur grand écran, la marque en haut à gauche est l'endroit où atterrit
 * l'animation de l'écran de chargement. Déplacer l'en-tête sans ajuster
 * `.chargement-sortie` dans globals.css casserait la continuité.
 */
export function CadreAuth({
  etiquette,
  phare,
  children,
}: {
  /** Petites capitales au-dessus du titre : « CONNEXION », « INSCRIPTION ». */
  etiquette: string
  /** Grand titre de la colonne de gauche, sur grand écran. */
  phare: string
  children: React.ReactNode
}) {
  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ background: "var(--fond)", color: "var(--texte)" }}
    >
      <div className="motif-fond" />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 pt-6 lg:px-12 lg:pt-8">
          <Logo taille={26} />
          <BasculeMode />
        </header>

        <main className="flex flex-1 items-center">
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-12">
            <section className="hidden lg:flex lg:flex-col lg:justify-center">
              <h1 className="text-[clamp(2.5rem,4vw,3.6rem)] font-medium leading-[1.05] tracking-[-0.02em]">
                {phare}
              </h1>

              <ul className="mt-12 grid grid-cols-3 gap-7">
                {PROMESSES.map((p) => (
                  <li key={p.mot}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.13em]">
                      {p.mot}
                    </div>
                    <p className="doux mt-2 text-[13px] leading-relaxed">
                      {p.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex w-full max-w-md flex-col justify-center gap-6 justify-self-center lg:justify-self-end">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-55">
                {etiquette}
              </div>
              {children}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
