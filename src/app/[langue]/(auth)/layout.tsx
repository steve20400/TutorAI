import { Reveil } from "@/composants/reveil"

/**
 * Laissé traversant : chaque page d'authentification pose son propre cadre,
 * parce qu'elles n'ont pas toutes le même registre visuel — un élève et un
 * parent ne s'inscrivent pas dans le même décor.
 *
 * Une seule chose est commune aux cinq écrans, et elle ne se voit pas : on
 * sonne à la porte du service dès qu'ils s'ouvrent. Render endort un service
 * gratuit au bout de quinze minutes et le réveil prend une cinquantaine de
 * secondes — soit à peu près le temps qu'on passe à taper une adresse et un
 * mot de passe. Lancé ici, le réveil tient dans ce temps-là, et la session
 * s'ouvre sur un service debout.
 *
 * Posé dans la mise en page plutôt que dans chaque écran : c'est le genre de
 * ligne qu'on oublie sur le sixième.
 */
export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Reveil />
      {children}
    </>
  )
}
