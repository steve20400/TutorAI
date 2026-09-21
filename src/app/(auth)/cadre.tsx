import { Registre } from "@/app/registre"

/** Cadre commun aux écrans d'authentification : centré, étroit, pleine hauteur. */
export function CadreAuth({
  registre = "eleve",
  children,
}: {
  registre?: "eleve" | "adulte"
  children: React.ReactNode
}) {
  return (
    <Registre type={registre}>
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
        {children}
      </main>
    </Registre>
  )
}
