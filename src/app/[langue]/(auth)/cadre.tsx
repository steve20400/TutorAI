import { Logo } from "@/composants/marque"
import { BasculeLangue } from "@/composants/langue"
import { BasculeMode } from "@/composants/theme"
import { dictionnaire, type Langue } from "@/langues"

/**
 * Cadre commun aux écrans d'authentification.
 *
 * Le motif couvre toute la page, sans carte ni barre de séparation : dès lors
 * que le fond est occupé d'un bout à l'autre, il n'y a plus rien à séparer.
 *
 * Sur grand écran, la marque en haut à gauche est l'endroit où atterrit
 * l'animation de l'écran de chargement. Déplacer l'en-tête sans ajuster
 * `.chargement-sortie` dans globals.css casserait la continuité.
 *
 * `langue` est passée en propriété plutôt que lue dans un contexte : ce cadre
 * est utilisé aussi bien par des pages serveur que par des pages client, et
 * seules les secondes peuvent lire un contexte React.
 */
export function CadreAuth({
  langue,
  etiquette,
  phare,
  action,
  children,
}: {
  langue: Langue
  /** Petites capitales au-dessus du titre : « CONNEXION », « INSCRIPTION ». */
  etiquette: string
  /** Grand titre de la colonne de gauche, sur grand écran. */
  phare: string
  /**
   * Posé sur la ligne de l'étiquette, poussé à droite.
   *
   * Sur sa propre ligne, il coûterait une hauteur que le téléphone n'a pas à
   * donner : les trois choix de rôle sont la vraie question de l'écran, et
   * c'est eux qu'on veut voir sans faire défiler.
   */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const d = dictionnaire(langue)

  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ background: "var(--fond)", color: "var(--texte)" }}
    >
      <div className="motif-fond" />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-6 pt-6 lg:px-12 lg:pt-8">
          <Logo taille={26} />
          <div className="flex items-center gap-1">
            <BasculeLangue />
            <BasculeMode />
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-12">
            <section className="hidden lg:flex lg:flex-col lg:justify-center">
              <h1 className="text-[clamp(2.5rem,4vw,3.6rem)] font-medium leading-[1.05] tracking-[-0.02em]">
                {phare}
              </h1>

              <ul className="mt-12 grid grid-cols-3 gap-7">
                {d.promesses.map((p) => (
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
              <div className="flex items-start justify-between gap-5">
                <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-55">
                  {etiquette}
                </div>
                {action}
              </div>
              {children}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
