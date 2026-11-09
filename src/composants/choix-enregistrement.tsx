"use client"

import { useTransition } from "react"

import { choisirEnregistrement } from "@/actions/enregistrement"
import { useLangue } from "@/langues/contexte"

/**
 * Le choix du parent : ses séances sont-elles enregistrées ?
 *
 * ── IL N'APPARAÎT QUE S'IL EXISTE ──
 *
 * Tant que l'administration n'a pas allumé le module pour la plateforme, ce
 * composant n'est pas monté du tout — pas grisé, pas « bientôt » : absent.
 * Montrer une fonctionnalité éteinte à quelqu'un qui ne peut rien en faire,
 * c'est lui promettre quelque chose qu'on ne tient pas, et cette application
 * en a déjà assez promis sans tenir.
 *
 * Quand l'administration a fermé CE compte — la porte du futur abonnement —
 * on l'affiche, mais sans interrupteur et en le disant. La différence compte :
 * « ça n'existe pas » et « ça existe et vous n'y avez pas droit » n'appellent
 * pas la même question.
 *
 * ── OUI PAR DÉFAUT ──
 *
 * Dès que l'administration allume, c'est actif pour tout le monde. C'est à
 * qui n'en veut pas de le dire. Un enregistrement qu'il faudrait réclamer
 * n'existerait pour presque personne — et c'est la promesse du produit.
 *
 * ── CE QUI SE PASSE PENDANT L'ENVOI ──
 *
 * Le bouton le dit. Sans cela on clique deux fois, faute de savoir si la
 * demande est partie.
 */
export function ChoixEnregistrement({
  souhaite,
  permis,
}: {
  souhaite: boolean
  /** L'administration a-t-elle ouvert ce compte ? */
  permis: boolean
}) {
  const { d } = useLangue()
  const t = d.compte.enregistrement
  const [enCours, demarrer] = useTransition()

  return (
    <section className="carte mt-4 p-4">
      <div className="text-[14px] font-medium">{t.titre}</div>
      <p className="doux mt-1 text-[12.5px] leading-relaxed">{t.detail}</p>

      {!permis ? (
        <p
          className="mt-3 rounded-[10px] px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{
            background: "color-mix(in srgb, var(--texte) 6%, var(--fond))",
            color: "var(--texte-doux)",
          }}
        >
          {t.ferme}
        </p>
      ) : (
        <form
          action={(donnees) => {
            demarrer(() => {
              void choisirEnregistrement(donnees)
            })
          }}
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="valeur" value={String(!souhaite)} />
          <span className="flex-1 text-[12.5px]">
            {souhaite ? t.actif : t.inactif}
          </span>
          <button
            type="submit"
            disabled={enCours}
            className={souhaite ? "bt2" : "bt1"}
            style={{ padding: "7px 14px", fontSize: 12.5 }}
          >
            {enCours ? (
              <span className="flex items-center gap-2">
                <span className="cercle-attente" aria-hidden />
                {d.commun.enCours}
              </span>
            ) : souhaite ? (
              t.couper
            ) : (
              t.remettre
            )}
          </button>
        </form>
      )}
    </section>
  )
}
