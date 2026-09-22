/**
 * Laissé traversant : chaque page d'authentification pose son propre cadre,
 * parce qu'elles n'ont pas toutes le même registre visuel — un élève et un
 * parent ne s'inscrivent pas dans le même décor.
 */
export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
