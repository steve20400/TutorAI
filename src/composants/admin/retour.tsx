"use client"

import { Retour } from "@/composants/retour"
import { useLangue } from "@/langues/contexte"

/**
 * Le retour de l'administration.
 *
 * Il n'a plus de corps propre : c'est `composants/retour.tsx`, qui était ici
 * et qui est remonté d'un cran le jour où le reste de l'application en a eu
 * besoin aussi. Ne reste que l'étiquette, qui lui est particulière.
 */
export function RetourAdmin({ vers }: { vers: string }) {
  const { d } = useLangue()
  return <Retour vers={vers} etiquette={d.admin.retour} />
}
