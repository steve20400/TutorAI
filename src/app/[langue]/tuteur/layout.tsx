import { Coque } from "@/composants/coque"
import { estLangue, LANGUE_PAR_DEFAUT } from "@/langues"

/**
 * La coque, sur les écrans du tuteur.
 *
 * Elle manquait aux trois : la liste des tuteurs, la création, la
 * conversation. L'enfant la voyait sur son accueil, cliquait « créer un
 * tuteur », et elle disparaissait — logo, nom de l'application, photo de
 * profil, tout. Pour revenir à son compte il fallait d'abord ressortir.

 * Une mise en page plutôt qu'un ajout dans chaque page : trois fichiers
 * auraient voulu dire un oubli au quatrième écran, et c'est exactement
 * l'histoire de cette barre — elle a été remise à la main page par page
 * jusqu'ici.
 */
export default async function MiseEnPageTuteur({
  params,
  children,
}: {
  params: Promise<{ langue: string }>
  children: React.ReactNode
}) {
  const { langue: brut } = await params
  const langue = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT

  return (
    <div className="flex min-h-dvh flex-col">
      <Coque langue={langue} />
      {children}
    </div>
  )
}
