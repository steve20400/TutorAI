"use client"

import { sureteDuMotDePasse, type Surete } from "@/lib/surete"
import { useLangue } from "@/langues/contexte"

/**
 * La sûreté du mot de passe, pendant qu'on l'écrit.
 *
 * Trois segments et un mot. Pas de pourcentage : « 64 % sûr » ne veut rien
 * dire et se lit comme une note, alors que la question est binaire pour celui
 * qui choisit — est-ce que je peux garder celui-là, oui ou non.
 *
 * Elle n'apparaît qu'une fois qu'on a commencé à taper. Au-dessus d'un champ
 * vide, elle annoncerait « trop court » à quelqu'un qui n'a encore rien fait
 * de mal.
 *
 * Elle ne bloque rien, et c'est une position. Le minimum est vérifié par le
 * service ; au-dessus, c'est la personne qui décide. Un formulaire qui refuse
 * un mot de passe jugé faible fabrique surtout des mots de passe notés sur un
 * papier.
 *
 * `aria-live` courtois et non insistant : le niveau change à chaque frappe, et
 * un lecteur d'écran qui l'annonce à chaque lettre couvre ce qu'on tape.
 */
export function JaugeMotDePasse({
  valeur,
  minimum,
  aEviter,
}: {
  valeur: string
  minimum: number
  /** Prénom, nom, début d'adresse — ce qu'un proche connaît déjà. */
  aEviter: readonly string[]
}) {
  const { d } = useLangue()
  const t = d.commun.surete

  if (!valeur) return null

  const niveau = sureteDuMotDePasse(valeur, minimum, aEviter)
  const mots: Record<Surete, string> = {
    0: t.tropCourt,
    1: t.faible,
    2: t.correct,
    3: t.solide,
  }

  // Le rouge et le vert gardent leur sens dans les quatre thèmes : ce sont
  // les deux couleurs qu'on lit sans les lire.
  const couleurs: Record<Surete, string> = {
    0: "var(--voyant)",
    1: "var(--voyant)",
    2: "#c98a12",
    3: "var(--accent-doux-texte)",
  }

  return (
    <div className="px-1 pt-0.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((seuil) => (
            <span
              key={seuil}
              className="h-[3px] flex-1 rounded-full transition-colors"
              style={{
                background:
                  niveau >= seuil
                    ? couleurs[niveau]
                    : "color-mix(in srgb, var(--texte) 12%, transparent)",
              }}
            />
          ))}
        </div>
        <span
          className="shrink-0 text-[11.5px]"
          style={{ color: couleurs[niveau] }}
        >
          {mots[niveau]}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {t.etiquette} : {mots[niveau]}
      </p>
    </div>
  )
}
